from flask import Blueprint, jsonify, request, url_for
from models import Student
from extensions import db
import utils.jwt_utils as jwt_utils
from sqlalchemy import cast, and_, or_
from sqlalchemy.types import String
from urllib.parse import urlencode

students_bp = Blueprint('students', __name__)


@students_bp.route('/student', methods=['GET'])
#@jwt_utils.token_required  # Uncomment this line to require authentication
def list_students():
    """
    Get list of students with optional search, sort, and pagination
    
    Supported parameters:
    - q (search): search across first_name, last_name, student_id, department
    - sort: field:direction (e.g., last_name:asc, first_name:desc, department:asc, year_level:asc)
    - page: page number (default: 1)
    - per_page: items per page (default: 20, max: 100)
    - department: filter by department
    - yearlevel: filter by year level (1-5)
    - section: filter by section (A-E)
    """
    
    def get_int_arg(name, default, minimum=1, maximum=None):
        """Helper to safely parse integer query parameters"""
        val = request.args.get(name)
        if not val:
            return default
        try:
            ival = int(val)
        except ValueError:
            return default
        if ival < minimum:
            return minimum
        if maximum and ival > maximum:
            return maximum
        return ival

    def get_string_arg(name, default='', allowed_values=None):
        """Helper to safely parse string query parameters with optional validation"""
        val = (request.args.get(name) or '').strip()
        if not val:
            return default
        if allowed_values and val not in allowed_values:
            return default
        return val

    try:
        # Pagination params
        page = get_int_arg('page', 1, minimum=1)
        per_page = get_int_arg('per_page', 20, minimum=1, maximum=100)

        # Search/filter params
        q = (request.args.get('q') or '').strip()
        department = get_string_arg('department', allowed_values=[
            'BSCpE', 'BSME', 'BSEE', 'BSECE', 'BSCE', 'BSChE', 'BSCerE', 'BSABE'
        ])
        yearlevel = get_string_arg('yearlevel', allowed_values=['1', '2', '3', '4', '5'])
        section = get_string_arg('section', allowed_values=['A', 'B', 'C', 'D', 'E'])
        gender = get_string_arg('gender', allowed_values=['MALE', 'FEMALE'])

        # Sort params
        sort_param = get_string_arg('sort', 'last_name:asc')
        sort_parts = sort_param.split(':')
        sort_field = sort_parts[0] if len(sort_parts) > 0 else 'last_name'
        sort_direction = sort_parts[1].lower() if len(sort_parts) > 1 else 'asc'

        # Validate sort direction
        if sort_direction not in ['asc', 'desc']:
            sort_direction = 'asc'

        # Build base query
        query = Student.query

        # Apply search filter
        if q:
            like_pattern = f"%{q}%"
            
            # For full name searches, also try to match against combined names
            search_filters = or_(
                Student.first_name.ilike(like_pattern),
                Student.middle_name.ilike(like_pattern),
                Student.last_name.ilike(like_pattern),
                Student.department.ilike(like_pattern),
                cast(Student.year_level, String).ilike(like_pattern)
            )
            
            # Add concatenated full name search for queries like "John Doe" or "John M. Doe"
            # This handles cases where someone searches for "Raven Gian S. Copon"
            from sqlalchemy import func
            full_name_concat = func.concat(
                func.coalesce(Student.first_name, ''), ' ',
                func.coalesce(Student.middle_name, ''), ' ', 
                func.coalesce(Student.last_name, '')
            )
            search_filters = or_(search_filters, full_name_concat.ilike(like_pattern))
            
            # Also try without middle name for searches like "John Doe"
            first_last_concat = func.concat(
                func.coalesce(Student.first_name, ''), ' ',
                func.coalesce(Student.last_name, '')
            )
            search_filters = or_(search_filters, first_last_concat.ilike(like_pattern))
            
            # Handle multi-word searches by checking if all parts exist in the full name
            if ' ' in q:
                # Split the query into parts and check if all parts exist in names
                query_parts = [part.strip() for part in q.split() if part.strip()]
                if query_parts:
                    # Create a filter that checks if all query parts match any name field
                    multi_word_filters = []
                    for part in query_parts:
                        part_pattern = f"%{part}%"
                        part_filter = or_(
                            Student.first_name.ilike(part_pattern),
                            Student.middle_name.ilike(part_pattern),
                            Student.last_name.ilike(part_pattern)
                        )
                        multi_word_filters.append(part_filter)
                    
                    # All parts must match (AND condition)
                    if multi_word_filters:
                        multi_word_search = and_(*multi_word_filters)
                        search_filters = or_(search_filters, multi_word_search)
            
            # Check if Student model has these fields before adding to search
            if hasattr(Student, 'id') and Student.id is not None:
                search_filters = or_(search_filters, Student.id.ilike(like_pattern))
            if hasattr(Student, 'uid'):
                search_filters = or_(search_filters, Student.uid.ilike(like_pattern))
            if hasattr(Student, 'section') and Student.section is not None:
                search_filters = or_(search_filters, Student.section.ilike(like_pattern))
                
            query = query.filter(search_filters)

        # Define Filter conditions
        filter_conditions = []
        if department:
            filter_conditions.append(Student.department == department)
        if yearlevel:
            try:
                year_int = int(yearlevel)
                filter_conditions.append(Student.year_level == year_int)
            except ValueError:
                pass  # Invalid year level, ignore
        if section:
            if hasattr(Student, 'section') and Student.section is not None:
                filter_conditions.append(Student.section == section)
        if gender:
                filter_conditions.append(Student.gender == gender)
        if filter_conditions:
            query = query.filter(and_(*filter_conditions))

        # Apply sorting
        sort_column = None
        if hasattr(Student, sort_field):
            sort_column = getattr(Student, sort_field)
        else:
            # Fallback to last_name if invalid field
            sort_column = Student.last_name

        if sort_direction == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Add secondary sort by id for consistent pagination
        if sort_field != 'uid' and hasattr(Student, 'uid'):
            query = query.order_by(Student.uid.asc())

        # Execute pagination
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )

        # Transform results
        students = []
        for student in pagination.items:
            try:
                student_dict = student.to_dict() if hasattr(student, 'to_dict') else {
                    'uid': getattr(student, 'uid', ''),
                    'id': getattr(student, 'id', ''),
                    'first_name': getattr(student, 'first_name', ''),
                    'middle_name': getattr(student, 'middle_name', ''),
                    'last_name': getattr(student, 'last_name', ''),
                    'department': getattr(student, 'department', ''),
                    'year_level': getattr(student, 'year_level', None),
                    'section': getattr(student, 'section', ''),
                    'profile_path': getattr(student, 'profile_path', None),
                    'created_at': getattr(student, 'created_at', None),
                    'updated_at': getattr(student, 'updated_at', None)
                }
                
                # Ensure consistent field names for frontend
                if 'year_level' in student_dict:
                    student_dict['yearlevel'] = student_dict['year_level']
                    
                # Add computed full_name if not present
                if 'full_name' not in student_dict:
                    parts = [
                        student_dict.get('first_name', ''),
                        student_dict.get('middle_name', ''),
                        student_dict.get('last_name', '')
                    ]
                    student_dict['full_name'] = ' '.join(p for p in parts if p).strip()
                
                # Convert profile_path to full URL if it exists
                profile_path = student_dict.get('profile_path')
                if profile_path and profile_path.strip():
                    # Clean the path and construct the full URL
                    clean_path = profile_path.strip()
                    if not clean_path.startswith('http'):
                        # Remove leading slash if present to avoid double slashes
                        if clean_path.startswith('/'):
                            clean_path = clean_path[1:]
                        # Check if path already starts with 'images/' to avoid duplication
                        if clean_path.startswith('images/'):
                            student_dict['avatar'] = f"{request.url_root}{clean_path}"
                        else:
                            student_dict['avatar'] = f"{request.url_root}images/{clean_path}"
                    else:
                        student_dict['avatar'] = clean_path
                else:
                    student_dict['avatar'] = None
                
                students.append(student_dict)
                
            except Exception as e:
                # Log the error but continue processing other students
                print(f"Error processing student {getattr(student, 'uid', 'unknown')}: {e}")
                continue

        # Helper to build pagination URLs
        def build_page_url(page_num):
            if page_num is None:
                return None
            args = dict(request.args)
            args['page'] = str(page_num)
            args['per_page'] = str(per_page)
            return f"{request.base_url}?{urlencode(args)}"

        # Build metadata
        meta = {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'total_pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
            'next_page': build_page_url(pagination.next_num) if pagination.has_next else None,
            'prev_page': build_page_url(pagination.prev_num) if pagination.has_prev else None,
            'first_page': build_page_url(1) if pagination.page > 1 else None,
            'last_page': build_page_url(pagination.pages) if pagination.page < pagination.pages else None,
            
            # Additional metadata for frontend
            'filters': {
                'q': q,
                'department': department,
                'yearlevel': yearlevel,
                'section': section,
                'gewnder': gender,
                'sort': sort_param
            },
            'available_filters': {
                'departments': ['BSCpE', 'BSME', 'BSEE', 'BSECE', 'BSCE', 'BSChE', 'BSCerE', 'BSABE'],
                'yearlevels': ['1', '2', '3', '4', '5'],
                'sections': ['A', 'B', 'C', 'D', 'E']
            }
        }

        return jsonify({
            'success': True,
            'items': students,
            'meta': meta
        }), 200

    except Exception as e:
        # Log the full error for debugging
        print(f"Error in list_students: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error occurred while fetching students',
            'error': str(e) if request.args.get('debug') else None
        }), 500


