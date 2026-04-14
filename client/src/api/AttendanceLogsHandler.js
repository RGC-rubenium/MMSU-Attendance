import AuthToken from '../Utils/AuthToken';

const BASE = '/api/scanner/attendance-logs';

const AttendanceLogsHandler = {
    async getLogs({ date = '', userType = '', search = '', department = '', status = '', page = 1, perPage = 50 } = {}) {
        const params = new URLSearchParams();
        if (date)       params.set('date', date);
        if (userType)   params.set('user_type', userType);
        if (search)     params.set('search', search);
        if (department) params.set('department', department);
        if (status)     params.set('status', status);
        params.set('page', page);
        params.set('per_page', perPage);

        const res = await fetch(`${BASE}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${AuthToken.getToken()}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },
    async deleteLog(logId) {
        const res = await fetch(`${BASE}/${logId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${AuthToken.getToken()}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },
};

export default AttendanceLogsHandler;
