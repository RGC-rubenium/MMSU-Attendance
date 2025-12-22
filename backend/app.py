from flask import Flask, jsonify, request

app = Flask(__name__)

SAMPLE_USERS = [
    { "id": 1, "studentId": 'S1001', "fullName": 'Maria Reyes', "avatar": 'https://i.pravatar.cc/150?img=12',"yearlevel": '1', "section": 'A', "department": 'BSCPE' },
    { "id": 2, "studentId": 'S1002', "fullName": 'Juan Dela Cruz', "avatar": 'https://i.pravatar.cc/150?img=32',"yearlevel": '2', "section": 'B', "department": 'HR' },
    { "id": 3, "studentId": 'S1003', "fullName": 'Anne Garcia', "avatar": 'https://i.pravatar.cc/150?img=18',"yearlevel": '3', "section": 'C', "department": 'Finance' },
    { "id": 4, "studentId": 'S1004', "fullName": 'Mark Torres', "avatar": 'https://i.pravatar.cc/150?img=24',"yearlevel": '4', "section": 'D', "department":"IT" },
    { "id": 5, "studentId": 'S1005', "fullName": 'Liza Santos', "avatar": 'https://i.pravatar.cc/150?img=8',"yearlevel":"5" ,"section":"E" ,"department":"HR"},
    { "id": 6, "studentId": 'S1006', "fullName": 'Rico Lopez', "avatar": 'https://i.pravatar.cc/150?img=47' ,"yearlevel":"6" ,"section":"F", "department":"Finance" },
    { "id": 7, "studentId": 'S1007', "fullName": 'Cathy Mendoza', "avatar": 'https://i.pravatar.cc/150?img=52' ,"yearlevel":"1" ,"section":"A", "department":"HR" },
    { "id": 8, "studentId": 'S1008', "fullName": 'James Villanueva', "avatar": 'https://i.pravatar.cc/150?img=15' ,"yearlevel":"2" ,"section":"B", "department":"Finance" },
]; 


@app.route('/api/student', methods=['GET'])
def get_student_dashboard():
    return jsonify(SAMPLE_USERS), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)