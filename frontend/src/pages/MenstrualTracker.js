import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../axiosInstance";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { DateRangePicker } from "react-date-range";
import { Line, Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import "chart.js/auto";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./MenstrualTracker.css"; 
import SymptomTracker from "../components/SymptomTracker";


Chart.register(...registerables);

function MenstrualTracker() {
    const [menstrualData, setMenstrualData] = useState([]);
    const [symptomLogs, setSymptomLogs] = useState([]);
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
    }, []);
    
    useEffect(() => {
        if (menstrualData.length > 0) {
            fetchPredictions();
        }
    }, [menstrualData]);
    

    useEffect(() => {
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
            if (response.data.next_period_start) {
                setPredictions(response.data);
            } else {
                setPredictions(null); // No predictions available
            }
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    };
    
    const handleSymptomsLogged = (logs) => {
        setSymptomLogs(logs);
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
    
        let cycleLength = 28; // Default
    
        // Dynamically calculate cycle length
        if (menstrualData.length > 0) {
            const lastStartDate = parseISO(menstrualData[0].start_date);
            cycleLength = differenceInDays(startDate, lastStartDate);
        }
    
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


    // 🔥 Marked Dates for Calendar (Past Periods & Predicted Cycles)
    const getMarkedDates = () => {
        let markedDates = {};
    
        // ✅ Mark past periods
        menstrualData.forEach((entry, index) => {
            const startDate = parseISO(entry.start_date);
            const endDate = parseISO(entry.end_date);
            let currentDate = startDate;
    
            while (currentDate <= endDate) {
                markedDates[format(currentDate, "yyyy-MM-dd")] = "past-period";
                currentDate = addDays(currentDate, 1);
            }
    
            // ✅ Mark cycle lengths (entire period gap)
            if (index > 0) {
                const prevEntry = menstrualData[index - 1];
                const prevEndDate = parseISO(prevEntry.end_date);
                const cycleStartDate = addDays(prevEndDate, 1);
                let cycleDate = cycleStartDate;
    
                while (cycleDate < startDate) {
                    markedDates[format(cycleDate, "yyyy-MM-dd")] = "cycle-gap";
                    cycleDate = addDays(cycleDate, 1);
                }
            }
        });
    
        // ✅ Mark predicted next period
        if (predictions?.next_period_start) {
            const startDate = parseISO(predictions.next_period_start);
            const periodLength = menstrualData.length > 0 ? menstrualData[0].period_length : 6;
            let currentDate = startDate;
    
            for (let i = 0; i < periodLength; i++) {
                markedDates[format(currentDate, "yyyy-MM-dd")] = "predicted-period";
                currentDate = addDays(currentDate, 1);
            }
        }
    // ✅ Mark symptom logs with a dot
        symptomLogs.forEach((entry) => {
            markedDates[entry.date] = "symptom-logged";
        });

        console.log("Updated Marked Dates:", markedDates); // Debugging output
        return markedDates;
    };
    const markedDates = getMarkedDates();
    const [chartData, setChartData] = useState({ cycle: null, period: null });

    useEffect(() => {
        if (menstrualData.length > 1) {
            const lastCycles = menstrualData.slice(-6); // Keep last 6 cycles
    
            const labels = lastCycles.map((entry) =>
                format(parseISO(entry.start_date), "MMM dd")
            );
    
            const cycleData = lastCycles.map((entry, index) => {
                if (index === 0) return null;
                const prevEntry = lastCycles[index - 1];
                return differenceInDays(
                    parseISO(entry.start_date),
                    parseISO(prevEntry.start_date)
                );
            });

            const periodData = lastCycles.map((entry) => entry.period_length);
    
            // 🚨 Debugging Log
            console.log("🔍 Debugging Chart Data:");
            console.log("Labels:", labels);
            console.log("Cycle Data:", cycleData);
            console.log("Period Data:", periodData);
    
            setChartData({
                cycle: {
                    labels: labels.slice(1), // Exclude first period since cycle needs two periods
                    datasets: [
                        {
                            label: "Cycle Length (Days)",
                            data: cycleData.slice(1), // Remove first null to match labels
                            borderColor: "#ff6384",
                            backgroundColor: "rgba(255, 99, 132, 0.2)",
                            tension: 0.3,
                            fill: true,
                        },
                    ],
                },
                period: {
                    labels,
                    datasets: [
                        {
                            label: "Period Length (Days)",
                            data: periodData,
                            backgroundColor: "#36a2eb",
                        },
                    ],
                },
            });
        }
    }, [menstrualData]);
     
     
    const cycleOptions = {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const index = context.dataIndex;
                        const currentLabel = context.chart.data.labels[index];
                        const cycleLength = context.raw;
    
                        if (index === 0) return null; // Skip first entry
    
                        const prevLabel = context.chart.data.labels[index - 1];
                        return `Cycle Length from ${prevLabel} → ${currentLabel}: ${cycleLength} days`;
                    },
                },
            },
            legend: {
                display: true,
                labels: {
                    color: "#000",
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Start of Next Period",
                    color: "#000",
                },
            },
            y: {
                title: {
                    display: true,
                    text: "Cycle Length (Days)",
                    color: "#000",
                },
                beginAtZero: false,
            },
        },
    };
    

    return (
        <div className="menstrual-tracker-container">
            <div className="calendar-section">
                <h1>Menstrual Tracker</h1>

                <SymptomTracker onSymptomsLogged={handleSymptomsLogged} />

                <Calendar
                    tileClassName={({ date }) => {
                        const formattedDate = format(date, "yyyy-MM-dd");

                        if (markedDates[formattedDate] === "past-period") {
                            return "past-period-day";
                        }
                        if (markedDates[formattedDate] === "predicted-period") {
                            return "predicted-period-day";
                        }
                        if (markedDates[formattedDate] === "symptom-logged") {
                            return "symptom-logged-day"; // Class for symptoms
                        }
                        return null;
                    }}
                    tileDisabled={() => true}
                />
                <button onClick={() => setShowModal(true)}>Log Period</button>
            </div>

            <div className="charts-section">
            <div className="chart">
    <h3>Cycle Length Trends</h3>
    {chartData.cycle && <Line data={chartData.cycle} options={cycleOptions} />}
</div>

    <div className="chart">
        <h3>Period Length Trends</h3>
        {chartData.period && <Bar data={chartData.period} />}
    </div>
</div>


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
        </div>
    );
}

export default MenstrualTracker;
