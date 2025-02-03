import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../axiosInstance";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { DateRangePicker } from "react-date-range";
import { format, addDays, parseISO } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./MenstrualTracker.css"; // Update this path if needed

function MenstrualTracker() {
    const [menstrualData, setMenstrualData] = useState([]);
    const [predictions, setPredictions] = useState(null);
    const [selectedRange, setSelectedRange] = useState([
        {
            startDate: new Date(),
            endDate: addDays(new Date(), 5),
            key: "selection",
        },
    ]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const refOne = useRef(null);

    useEffect(() => {
        fetchData();
        fetchPredictions();
        document.addEventListener("keydown", hideOnEscape, true);
        document.addEventListener("click", hideOnClickOutside, true);
    }, []);

    const fetchData = async () => {
        try {
            const response = await axiosInstance.get("/users/menstrual-data/");
            setMenstrualData(response.data);
        } catch (error) {
            console.error("Error fetching menstrual data:", error);
        }
    };

    const fetchPredictions = async () => {
        try {
            const response = await axiosInstance.get("/users/predict-cycle/");
            setPredictions(response.data);
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    };

    const hideOnEscape = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const hideOnClickOutside = (e) => {
        if (refOne.current && !refOne.current.contains(e.target)) {
            setOpen(false);
        }
    };

    const handleSavePeriod = async () => {
        setLoading(true);

        const startDate = selectedRange[0].startDate;
        const endDate = selectedRange[0].endDate;
        const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        // Default cycle length to 28 if there's no previous data
        const cycleLength = menstrualData.length > 0 ? menstrualData[0].cycle_length : 28;

        try {
            await axiosInstance.post("/users/menstrual-data/", {
                start_date: format(startDate, "yyyy-MM-dd"),
                end_date: format(endDate, "yyyy-MM-dd"),
                period_length: periodLength,
                cycle_length: cycleLength,
            });

            setShowModal(false);
            fetchData();
            fetchPredictions();
        } catch (error) {
            console.error("Error saving period data:", error);
        } finally {
            setLoading(false);
        }
    };

    // 🔥 New Code: Get marked dates for calendar (previous & predicted cycles)
    const getMarkedDates = () => {
        let markedDates = {};

        // ✅ Mark previous cycles
        menstrualData.forEach((entry) => {
            const startDate = parseISO(entry.start_date);
            const endDate = parseISO(entry.end_date);
            let currentDate = startDate;

            while (currentDate <= endDate) {
                markedDates[format(currentDate, "yyyy-MM-dd")] = "past-period";
                currentDate = addDays(currentDate, 1);
            }
        });

        // ✅ Mark predicted next period
        if (predictions?.next_period_start) {
            const startDate = parseISO(predictions.next_period_start);
            const periodLength = menstrualData.length > 0 ? menstrualData[0].period_length : 6; // Default 6 days if no data
            let currentDate = startDate;

            for (let i = 0; i < periodLength; i++) {
                markedDates[format(currentDate, "yyyy-MM-dd")] = "predicted-period";
                currentDate = addDays(currentDate, 1);
            }
        }
        console.log("Marked Dates:", markedDates); 
        return markedDates;
    };

    const markedDates = getMarkedDates();

    return (
        <div className="menstrual-tracker">
            <h1>Menstrual Tracker</h1>

            {/* 🔥 New Code: Calendar with markings */}
            <Calendar
                tileClassName={({ date }) => {
                    const formattedDate = format(date, "yyyy-MM-dd");

                    if (markedDates[formattedDate] === "past-period") {
                        return "past-period-day";
                    }
                    if (markedDates[formattedDate] === "predicted-period") {
                        return "predicted-period-day";
                    }
                    return null;
                }}
                tileDisabled={() => true} // Disable all dates (view-only mode)
            />

            <button onClick={() => setShowModal(true)}>Log Period</button>

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Select Period Dates</h2>

                        <input
                            value={`${format(selectedRange[0].startDate, "MM/dd/yyyy")} to ${format(
                                selectedRange[0].endDate,
                                "MM/dd/yyyy"
                            )}`}
                            readOnly
                            className="inputBox"
                            onClick={() => setOpen((prev) => !prev)}
                        />

                        <div ref={refOne}>
                            {open && (
                                <DateRangePicker
                                    onChange={(item) => setSelectedRange([item.selection])}
                                    editableDateInputs={true}
                                    moveRangeOnFirstSelection={false}
                                    ranges={selectedRange}
                                    months={2}
                                    direction="horizontal"
                                    className="calendarElement"
                                />
                            )}
                        </div>

                        <button onClick={handleSavePeriod} disabled={loading}>
                            {loading ? "Saving..." : "Save Period"}
                        </button>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}

            {menstrualData.length === 0 && (
                <div className="no-data">
                    <p>No period data available. Please log your first period to start tracking.</p>
                </div>
            )}

            {predictions ? (
                <div className="predictions">
                    <h3>Predictions</h3>
                    <p>Next Period Start: {predictions.next_period_start}</p>
                    <p>
                        Fertile Window: {predictions.fertile_window_start} - {predictions.fertile_window_end}
                    </p>
                </div>
            ) : null}
        </div>
    );
}

export default MenstrualTracker;
