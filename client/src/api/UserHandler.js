export default class UserHandler {
    static API_BASE = 'http://127.0.0.1:5000/api';

    async fetchStudents() {
        try {
            // Use the class name to access static properties
            const response = await fetch(`${UserHandler.API_BASE}/student`);

            if (!response.ok) {
                // This helps you see if it's a 404 or 500 error in the console
                const errorText = await response.text();
                console.error("Server Response:", errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Could not fetch students:", error);
            return []; 
        }
    }
}
