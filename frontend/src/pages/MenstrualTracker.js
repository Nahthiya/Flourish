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
import Header from "../components/Header";
import Footer from "../components/Footer";

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
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showSymptomModal, setShowSymptomModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const refOne = useRef(null);

    useEffect(() => {
        fetchData();
        fetchSymptoms();
    }, []);

    useEffect(() => {
        if (menstrualData.length > 0) {
            fetchPredictions();
        }
    }, [menstrualData]);

    useEffect(() => {
        document.addEventListener("keydown", hideOnEscape, true);
        document.addEventListener("click", hideOnClickOutside, true);
        return () => {
            document.removeEventListener("keydown", hideOnEscape, true);
            document.removeEventListener("click", hideOnClickOutside, true);
        };
    }, []);

    const fetchData = async () => {
        try {
            const response = await axiosInstance.get("/users/menstrual-data/");
            setMenstrualData(response.data);
        } catch (error) {
            console.error("Error fetching menstrual data:", error);
        }
    };

    const fetchSymptoms = async () => {
        try {
            const response = await axiosInstance.get("/users/symptom-logs/");
            setSymptomLogs(response.data);
        } catch (error) {
            console.error("Error fetching symptom logs:", error);
        }
    };

    const fetchPredictions = async () => {
        try {
            const response = await axiosInstance.get("/users/predict-cycle/");
            if (response.data.next_period_start) {
                setPredictions(response.data);
            } else {
                setPredictions(null);
            }
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    };

    const handleSymptomsLogged = (newLogs) => {
        setSymptomLogs((prev) => [...prev, ...newLogs]);
    };

    const hideOnEscape = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
            setShowPeriodModal(false);
            setShowSymptomModal(false);
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

        try {
            await axiosInstance.post("/users/menstrual-data/", {
                start_date: format(startDate, "yyyy-MM-dd"),
                end_date: format(endDate, "yyyy-MM-dd"),
                period_length: periodLength,
            });

            setShowPeriodModal(false);
            fetchData();
            fetchPredictions();
        } catch (error) {
            console.error("Error saving period data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getMarkedDates = () => {
        let markedDates = {};

        menstrualData.forEach((entry) => {
            const startDate = parseISO(entry.start_date);
            const endDate = parseISO(entry.end_date);
            let currentDate = startDate;

            while (currentDate <= endDate) {
                markedDates[format(currentDate, "yyyy-MM-dd")] = "past-period";
                currentDate = addDays(currentDate, 1);
            }
        });

        if (predictions?.next_period_start) {
            const startDate = parseISO(predictions.next_period_start);
            const endDate = parseISO(predictions.next_period_end);
            let currentDate = startDate;

            while (currentDate <= endDate) {
                markedDates[format(currentDate, "yyyy-MM-dd")] = "predicted-period";
                currentDate = addDays(currentDate, 1);
            }
        }

        symptomLogs.forEach((entry) => {
            markedDates[entry.date] = "symptom-logged";
        });

        return markedDates;
    };

    const markedDates = getMarkedDates();

    const [chartData, setChartData] = useState({ cycle: null, period: null });

    useEffect(() => {
        if (menstrualData.length > 1) {
            const lastCycles = menstrualData.slice(-6);

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

            setChartData({
                cycle: {
                    labels: labels.slice(1),
                    datasets: [
                        {
                            label: "Cycle Length (Days)",
                            data: cycleData.slice(1),
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

                        if (index === 0) return null;

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

    const periodOptions = {
        responsive: true,
        plugins: {
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
                    text: "Period Start Date",
                    color: "#000",
                },
            },
            y: {
                title: {
                    display: true,
                    text: "Period Length (Days)",
                    color: "#000",
                },
                beginAtZero: true,
            },
        },
    };

    const calculateAverages = () => {
        const cycleLengths = menstrualData.map((entry) => entry.cycle_length).filter(Boolean);
        const periodLengths = menstrualData.map((entry) => entry.period_length).filter(Boolean);

        const avgCycleLength = cycleLengths.length
            ? (cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length).toFixed(1)
            : 0;
        const avgPeriodLength = periodLengths.length
            ? (periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length).toFixed(1)
            : 0;
        const totalSymptoms = symptomLogs.length;

        return { avgCycleLength, avgPeriodLength, totalSymptoms };
    };

    const { avgCycleLength, avgPeriodLength, totalSymptoms } = calculateAverages();

    const getRecentSymptoms = () => {
        const recentLogs = symptomLogs.slice(0, 5);
        return recentLogs.flatMap((log) => log.symptoms);
    };

    return (
        <div className="page-container">
            <Header />
            <div className="menstrual-tracker-container">
                <h1>My Cycle Tracker</h1>
                <div className="tracker-content">
                    <div className="left-section">
                        <div className="cycle-summary">
                            <h2>Cycle Summary</h2>
                            <div className="summary-details">
                                <p><strong>Last Period:</strong> {menstrualData.length > 0 ? format(parseISO(menstrualData[0].start_date), "MMMM d, yyyy") : "N/A"}</p>
                                <p><strong>Next Period:</strong> {predictions?.next_period_start ? format(parseISO(predictions.next_period_start), "MMMM d, yyyy") : "N/A"}</p>
                                <p><strong>Cycle Length:</strong> {menstrualData.length > 0 ? `${menstrualData[0].cycle_length} days` : "N/A"}</p>
                                <p><strong>Period Length:</strong> {menstrualData.length > 0 ? `${menstrualData[0].period_length} days` : "N/A"}</p>
                            </div>
                            <div className="recent-symptoms">
                                <h3>Recent Symptoms</h3>
                                <div className="symptoms-list">
                                    {getRecentSymptoms().length > 0 ? (
                                        getRecentSymptoms().map((symptom, index) => (
                                            <span key={index} className="symptom-tag">{symptom}</span>
                                        ))
                                    ) : (
                                        <p>No recent symptoms logged.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="right-section">
                        <div className="calendar-section">
                            <h2>March 2025</h2>
                            <Calendar
                                defaultView="month"
                                value={new Date(2025, 2, 1)}
                                tileClassName={({ date }) => {
                                    const formattedDate = format(date, "yyyy-MM-dd");
                                    if (markedDates[formattedDate] === "past-period") {
                                        return "past-period-day";
                                    }
                                    if (markedDates[formattedDate] === "predicted-period") {
                                        return "predicted-period-day";
                                    }
                                    if (markedDates[formattedDate] === "symptom-logged") {
                                        return "symptom-logged-day";
                                    }
                                    return null;
                                }}
                                tileDisabled={() => true}
                            />
                            <div className="calendar-buttons">
                                <button className="log-period-btn" onClick={() => setShowPeriodModal(true)}>Log Period</button>
                                <button className="log-symptoms-btn" onClick={() => setShowSymptomModal(true)}>
                                    Log Symptoms
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="insights-section">
                    <h2>Cycle Insights</h2>
                    <div className="insights-cards">
                        <div className="insight-card">
                            <h3>Average Cycle</h3>
                            <p>{avgCycleLength} days</p>
                        </div>
                        <div className="insight-card">
                            <h3>Average Period</h3>
                            <p>{avgPeriodLength} days</p>
                        </div>
                        <div className="insight-card">
                            <h3>Symptoms Logged</h3>
                            <p>{totalSymptoms}</p>
                        </div>
                    </div>
                </div>

                <div className="charts-section">
                    <div className="chart">
                        <h3>Cycle Length Trends</h3>
                        {chartData.cycle && <Line data={chartData.cycle} options={cycleOptions} />}
                    </div>
                    <div className="chart">
                        <h3>Period Length Trends</h3>
                        {chartData.period && <Bar data={chartData.period} options={periodOptions} />}
                    </div>
                </div>

                <div className="export-section">
                    <h2>Export & Reports</h2>
                    <div className="export-buttons">
                        <button className="export-btn">Download PDF Report</button>
                        <button className="export-btn">Export Data as CSV</button>
                        <button className="export-btn">Share with Doctor</button>
                    </div>
                </div>

                {showPeriodModal && (
                    <div className="modal-overlay">
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
                            <div className="modal-buttons">
                                <button onClick={handleSavePeriod} disabled={loading}>
                                    {loading ? "Saving..." : "Save Period"}
                                </button>
                                <button onClick={() => setShowPeriodModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

{showSymptomModal && (
    <SymptomTracker
        onSymptomsLogged={handleSymptomsLogged}
        onClose={() => setShowSymptomModal(false)}
        selectedDate={new Date()}
    />
)}
            </div>
            <Footer />
        </div>
    );
}

export default MenstrualTracker;