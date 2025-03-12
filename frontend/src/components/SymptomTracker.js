import React, { useEffect, useCallback, useState } from "react";
import axiosInstance from "../axiosInstance";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./SymptomTracker.css";

function SymptomTracker({ onSymptomsLogged, onClose, selectedDate: initialDate }) {
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [loggedSymptoms, setLoggedSymptoms] = useState([]);

    const symptomOptions = [
        "Cramps", "Headache", "Bloating", "Mood Swings", "Fatigue", "Nausea",
        "Acne", "Back Pain", "Food Cravings", "Insomnia"
    ];

    const fetchLoggedSymptoms = useCallback(async () => {
        try {
            const response = await axiosInstance.get("/users/symptom-logs/");
            console.log("Fetched symptom logs:", response.data);
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
            date: selectedDate.toISOString().split("T")[0],
            symptoms: selectedSymptoms,
        };
    
        console.log("Sending payload to /users/symptom-logs/:", payload);
    
        try {
            const response = await axiosInstance.post("/users/symptom-logs/", payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            console.log("Response from server:", response.data);
            if (onSymptomsLogged) {
                // Check if this was an update (combined_symptoms exists) or a new entry
                const loggedSymptoms = response.data.combined_symptoms
                    ? { date: payload.date, symptoms: response.data.combined_symptoms, cycle_day: response.data.cycle_day }
                    : { date: payload.date, symptoms: payload.symptoms, cycle_day: response.data.cycle_day };
                onSymptomsLogged([loggedSymptoms]);
            }
            if (onClose) onClose();
            setSelectedSymptoms([]);
            fetchLoggedSymptoms(); // Refresh the list to show the updated entry
        } catch (error) {
            console.error("Error saving symptoms:", error.response ? error.response.data : error);
        }
    };

    return (
        <div className="modal-overlay">
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
                                <strong>{log.date}:</strong> {log.symptoms.join(", ")} {log.cycle_day ? `(Cycle Day: ${log.cycle_day})` : "(Cycle Day: Not calculated)"}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="modal-buttons">
                    <button className="save-btn" onClick={handleSaveSymptoms}>Save Symptoms</button>
                    <button className="close-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default SymptomTracker;