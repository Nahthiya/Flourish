import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../axiosInstance";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./SymptomTracker.css"; // Ensure styles are included

function SymptomTracker({ onSymptomsLogged }) {
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [loggedSymptoms, setLoggedSymptoms] = useState([]);

    const symptomOptions = [
        "Cramps", "Headache", "Bloating", "Mood Swings", "Fatigue", "Nausea",
        "Acne", "Back Pain", "Food Cravings", "Insomnia"
    ];

    const fetchLoggedSymptoms = useCallback(async () => {
        try {
            const response = await axiosInstance.get("/users/symptom-logs/");
            setLoggedSymptoms(response.data);
        } catch (error) {
            console.error("Error fetching logged symptoms:", error);
        }
    }, []);
    
    useEffect(() => {
        fetchLoggedSymptoms();
    }, [fetchLoggedSymptoms]);
    

    const handleSymptomToggle = (symptom) => {
        setSelectedSymptoms((prev) =>
            prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
        );
    };

    const handleSaveSymptoms = async () => {
        if (selectedSymptoms.length === 0) {
            alert("Please select at least one symptom.");
            return;
        }
    
        const payload = {
            date: selectedDate.toISOString().split("T")[0], // Format date as YYYY-MM-DD
            symptoms: selectedSymptoms,
        };
    
        console.log("📡 Sending payload:", payload); // Debugging log
    
        try {
            // Include Authorization header
            const response = await axiosInstance.post("/users/symptom-logs/", payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`, // Assuming token is stored in localStorage
                },
            });
            console.log("✅ Successfully saved symptoms:", response.data);
            setShowModal(false);
            setSelectedSymptoms([]);
            fetchLoggedSymptoms(); // Refresh logged symptoms
        } catch (error) {
            console.error("❌ Error saving symptoms:", error.response ? error.response.data : error);
        }
    };
    ;       
    

    return (
        <div>
            <button className="log-symptoms-btn" onClick={() => setShowModal(true)}>
                Log Symptoms
            </button>

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Select Symptoms for Date</h2>

                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            dateFormat="yyyy-MM-dd"
                            className="date-picker"
                        />

                        <div className="symptom-list">
                            {symptomOptions.map((symptom) => (
                                <label key={symptom} className="symptom-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedSymptoms.includes(symptom)}
                                        onChange={() => handleSymptomToggle(symptom)}
                                    />
                                    {symptom}
                                </label>
                            ))}
                        </div>
                        <div className="logged-symptoms">
    <h3>Previously Logged Symptoms</h3>
    <ul>
        {loggedSymptoms.map((log, index) => (
            <li key={index}>
                <strong>{log.date}:</strong> {log.symptoms.join(", ")}
            </li>
        ))}
    </ul>
</div>

                        <button className="save-btn" onClick={handleSaveSymptoms}>Save Symptoms</button>
                        <button className="close-btn" onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SymptomTracker;
