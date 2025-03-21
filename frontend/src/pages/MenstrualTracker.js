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
import { toast } from 'react-toastify';
import jsPDF from "jspdf";
import Papa from 'papaparse';

Chart.register(...registerables);

function MenstrualTracker() {
    const [menstrualData, setMenstrualData] = useState([]);
    const [symptomLogs, setSymptomLogs] = useState([]);
    const [predictions, setPredictions] = useState(null);
    const [selectedRange, setSelectedRange] = useState([
        { startDate: new Date(), endDate: addDays(new Date(), 5), key: "selection" },
    ]);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showSymptomModal, setShowSymptomModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState('');
    const refOne = useRef(null);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedDateSymptoms, setSelectedDateSymptoms] = useState(null);

    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const response = await axiosInstance.get('../users/auth-status/');
                setUsername(response.data.username);
            } catch (error) {
                console.error("Error fetching username:", error);
            }
        };
        fetchUsername();
        fetchData();
        fetchSymptoms();
    }, []);

    useEffect(() => {
        if (menstrualData.length > 0) fetchPredictions();
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
            setPredictions(response.data.next_period_start ? response.data : null);
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    };

    const handleSymptomsLogged = (newLogs) => {
        setSymptomLogs((prev) => [...prev, ...newLogs]);
        toast.success("Symptoms logged successfully");
    };

    const hideOnEscape = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
            setShowPeriodModal(false);
            setShowSymptomModal(false);
        }
    };

    const hideOnClickOutside = (e) => {
        if (refOne.current && !refOne.current.contains(e.target)) setOpen(false);
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
            toast.success("Period saved successfully");
            setShowPeriodModal(false);
            fetchData();
            fetchPredictions();
        } catch (error) {
            console.error("Error saving period data:", error);
            toast.error("Failed to save period data");
        } finally {
            setLoading(false);
        }
    };

    const getMarkedDates = () => {
        let markedDates = {};
        
        // Mark past period dates
        menstrualData.forEach((entry) => {
            let currentDate = parseISO(entry.start_date);
            const endDate = parseISO(entry.end_date);
            while (currentDate <= endDate) {
                const formattedDate = format(currentDate, "yyyy-MM-dd");
                markedDates[formattedDate] = markedDates[formattedDate] || []; // Initialize as array if not set
                markedDates[formattedDate].push("past-period"); // Add past-period state
                currentDate = addDays(currentDate, 1);
            }
        });
    
        // Mark predicted period dates
        if (predictions?.next_period_start) {
            let currentDate = parseISO(predictions.next_period_start);
            const endDate = parseISO(predictions.next_period_end);
            while (currentDate <= endDate) {
                const formattedDate = format(currentDate, "yyyy-MM-dd");
                markedDates[formattedDate] = markedDates[formattedDate] || []; // Initialize as array if not set
                markedDates[formattedDate].push("predicted-period"); // Add predicted-period state
                currentDate = addDays(currentDate, 1);
            }
        }
    
        // Mark symptom-logged dates
        symptomLogs.forEach((entry) => {
            const formattedDate = entry.date;
            markedDates[formattedDate] = markedDates[formattedDate] || []; // Initialize as array if not set
            markedDates[formattedDate].push("symptom-logged"); // Add symptom-logged state
        });
    
        return markedDates;
    };

    const markedDates = getMarkedDates();

    const [chartData, setChartData] = useState({ cycle: null, period: null });

    useEffect(() => {
        if (menstrualData.length > 1) {
            const lastCycles = menstrualData.slice(-6);
            const labels = lastCycles.map((entry) => format(parseISO(entry.start_date), "MMM dd"));
            const cycleData = lastCycles.map((entry, index) => {
                if (index === 0) return null;
                const prevEntry = lastCycles[index - 1];
                return differenceInDays(parseISO(entry.start_date), parseISO(prevEntry.start_date));
            });
            const periodData = lastCycles.map((entry) => entry.period_length);

            setChartData({
                cycle: {
                    labels: labels.slice(1),
                    datasets: [{
                        label: "Cycle Length (Days)",
                        data: cycleData.slice(1),
                        borderColor: "#ff6384",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        tension: 0.3,
                        fill: true,
                    }],
                },
                period: {
                    labels,
                    datasets: [
                        {
                            label: "Period Length (Background)",
                            data: periodData,
                            backgroundColor: "#e6f0fa", // Very light blue
                            barThickness: 40, // Thick bars
                            borderWidth: 0,
                            categoryPercentage: 0.8, // Control the width of the category (shared by both bars)
                            barPercentage: 1.0, // Ensure the bar takes up the full category width
                            borderWidth: 0,
                        },
                        {
                            label: "Period Length (Overlay)",
                            data: periodData,
                            backgroundColor: "#addbfa", // Slightly darker blue
                            barThickness: 20, // Thinner bars
                            categoryPercentage: 0.8, // Match the background bar’s category width
                            barPercentage: 0.5, // Make the bar take up 50% of the category width (centers it)
                            borderWidth: 0,
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
            legend: { display: true, labels: { color: "#000" } },
        },
        scales: {
            x: { title: { display: true, text: "Start of Next Period", color: "#000" } },
            y: { title: { display: true, text: "Cycle Length (Days)", color: "#000" }, beginAtZero: false },
        },
    };

    const periodOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Period Start Date",
                    color: "#5e4b8b",
                    font: { size: 14 },
                },
                grid: { display: false },
            },
            y: {
                title: {
                    display: true,
                    text: "Period Length (Days)",
                    color: "#5e4b8b",
                    font: { size: 14 },
                },
                beginAtZero: true,
                max: Math.max(...menstrualData.map(cycle => cycle.period_length)) + 2,
                ticks: { stepSize: 1 },
            },
        },
        plugins: {
            legend: { display: false }, // Hide legend since it’s a layered effect
            tooltip: {
                enabled: true,
                callbacks: {
                    label: (context) => `${context.raw} days`,
                },
            },
        },
        elements: {
            bar: {
                borderRadius: 5, // Rounded edges
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
        return { avgCycleLength, avgPeriodLength };
    };

    const { avgCycleLength, avgPeriodLength } = calculateAverages();

    const getRecentSymptoms = () => {
        const recentLogs = symptomLogs.slice(0, 5);
        const symptoms = recentLogs.flatMap(log => log.symptoms);
        return [...new Set(symptoms)].slice(0, 5);
    };

// Calculate current cycle day (days since the start of the most recent period)
const latestPeriod = menstrualData.length > 0 ? menstrualData[menstrualData.length - 1] : null;
const rawCycleDay = latestPeriod
    ? differenceInDays(new Date(), parseISO(latestPeriod.start_date)) + 1
    : "N/A";

    // Calculate days remaining for the next period
    const daysRemaining = predictions?.next_period_start
        ? differenceInDays(parseISO(predictions.next_period_start), new Date())
        : "N/A";

    // Adjust average cycle length for phase calculations
const avgCycleLengthCalc = menstrualData.length
    ? menstrualData.reduce((sum, entry) => sum + (entry.cycle_length || 28), 0) / menstrualData.length
    : 28;

// Cap the cycle day at the average cycle length if the predicted next period has passed
const currentCycleDay = rawCycleDay !== "N/A" && daysRemaining !== "N/A" && daysRemaining < 0
    ? rawCycleDay % avgCycleLengthCalc || avgCycleLengthCalc // Reset cycle day to within the cycle length
    : rawCycleDay;

    const getCyclePhase = (cycleDay, cycleLength) => {
        const phases = [
            { name: "Menstrual", start: 1, end: 5, color: "#ff6384" },
            { name: "Follicular", start: 6, end: Math.floor(cycleLength / 2), color: "#95d0f9" },
            { name: "Ovulation", start: Math.floor(cycleLength / 2) + 1, end: Math.floor(cycleLength / 2) + 3, color: "#ffe9b4" },
            { name: "Luteal", start: Math.floor(cycleLength / 2) + 4, end: cycleLength, color: "#ae9dd5" },
        ];
        if (cycleDay <= 0 || !cycleDay || typeof cycleDay === "string") return { name: "Unknown", color: "#ccc" };
        // Adjust cycle day to loop within the cycle length
        const adjustedCycleDay = cycleDay > cycleLength ? cycleDay % cycleLength || cycleLength : cycleDay;
        for (const phase of phases) {
            if (adjustedCycleDay >= phase.start && adjustedCycleDay <= phase.end) return phase;
        }
        return { name: "Unknown", color: "#ccc" };
    };
    
    const currentPhase = getCyclePhase(currentCycleDay, avgCycleLengthCalc);

    const handleDownloadPDF = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const config = {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                },
            };
    
            // Fetch user data
            const userResponse = await axiosInstance.get("/users/users/auth-status/", config);
            const userName = userResponse.data.username || "User";
    
            // Fetch report data
            console.log("Fetching report with token:", token);
            const response = await axiosInstance.get("/users/symptom-report/", config);
            console.log("Fetched report data:", response.data);
    
            // Initialize jsPDF
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4",
            });
    
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 80; // Increased top margin to 80 points
            let yPosition = margin;
    
            // Function to add a new page if content exceeds page height
            const addNewPageIfNeeded = () => {
                if (yPosition + 40 > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin; // Reset yPosition to top of new page
                }
            };
    
            // Function to ensure heading and table stay together
            const ensureHeadingAndTableFit = (headingText, tableData, columnWidths, tableX) => {
                const headingHeight = 30; // Approximate height for heading (16pt font + padding)
                const headerRowHeight = 20; // Height of header row
                const dataRowHeight = 25; // Height of each data row
                const padding = 20; // Additional padding between heading and table
    
                // Estimate table height: header + max 6 rows (based on slice(-6)) + padding
                const maxRows = Math.min(tableData.length, 6) + 1; // +1 for header row
                const tableHeight = headerRowHeight + (maxRows - 1) * dataRowHeight + padding;
    
                const totalHeight = headingHeight + tableHeight;
    
                // Check if there’s enough space; if not, force a new page
                if (yPosition + totalHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                }
            };
    
            // Set font and styles
            pdf.setFont("helvetica");
    
            // Top Heading - Larger, Bold, Underlined
            pdf.setFontSize(20);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 0, 0); // Black text for heading
            const headingText = "Menstrual Cycle and Symptom Report";
            const headingWidth = pdf.getTextWidth(headingText);
            pdf.text(headingText, pageWidth / 2, yPosition, { align: "center" });
            pdf.setLineWidth(0.5);
            pdf.line(
                (pageWidth - headingWidth) / 2,
                yPosition + 5,
                (pageWidth + headingWidth) / 2,
                yPosition + 5
            );
            yPosition += 60; // Increased space below heading
    
            // Name and Date/Time - Left Aligned
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "normal");
            pdf.text(`Prepared for: ${userName}`, margin, yPosition);
            yPosition += 20; // Increased space
    
            const today = new Date();
            const formattedDateTime = format(today, "MMMM d, yyyy, h:mm a");
            pdf.text(`Date Generated: ${formattedDateTime}`, margin, yPosition);
            yPosition += 40; // Increased space after name and date
    
            // Insights - Center Aligned
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text(
                `Average Cycle Length: ${avgCycleLength} days | Average Period Length: ${avgPeriodLength} days`,
                pageWidth / 2,
                yPosition,
                { align: "center" }
            );
            yPosition += 60; // Increased space after insights
    
            // Cycle Length Trends - Table
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            const cycleLengthData = [];
            if (menstrualData.length > 1) {
                const lastCycles = menstrualData.slice(-6);
                lastCycles.forEach((entry, index) => {
                    if (index === 0) return;
                    const prevEntry = lastCycles[index - 1];
                    const startDate = parseISO(prevEntry.start_date);
                    const endDate = parseISO(entry.start_date);
                    const cycleLength = differenceInDays(endDate, startDate);
                    cycleLengthData.push([
                        format(startDate, "MMM d, yyyy"),
                        format(endDate, "MMM d, yyyy"),
                        `${cycleLength} days`,
                    ]);
                });
            }
            ensureHeadingAndTableFit("Cycle Length Trends", cycleLengthData, [150, 150, 100], (pageWidth - 400) / 2);
            pdf.text("Cycle Length Trends", margin, yPosition);
            yPosition += 30; // Increased space below section heading
            addNewPageIfNeeded();
    
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            if (menstrualData.length > 1) {
                const lastCycles = menstrualData.slice(-6);
                const tableData = [];
                lastCycles.forEach((entry, index) => {
                    if (index === 0) return;
                    const prevEntry = lastCycles[index - 1];
                    const startDate = parseISO(prevEntry.start_date);
                    const endDate = parseISO(entry.start_date);
                    const cycleLength = differenceInDays(endDate, startDate);
                    tableData.push([
                        format(startDate, "MMM d, yyyy"),
                        format(endDate, "MMM d, yyyy"),
                        `${cycleLength} days`,
                    ]);
                });
    
                pdf.setLineWidth(0.3);
                pdf.setDrawColor(224, 224, 224); // Light grey #e0e0e0 for borders
    
                // Table Header
                const headers = ["Start Date", "End Date", "No. of Days"].map(header => header.toUpperCase());
                const columnWidths = [150, 150, 100];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); // Very very light purple #f9f2fc for header
                pdf.setTextColor(0, 0, 0); // Black text for header
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); // Explicitly set light purple for each header cell
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // Table Rows
                pdf.setFillColor(255, 255, 255); // White background for all rows
                pdf.setTextColor(0, 0, 0); // Black text for readability
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); // Explicitly set white for each row cell
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F"); // Fixed: replaced 'index' with 'colIndex'
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20); // Fixed: replaced 'index' with 'colIndex'
                        pdf.text(cell, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; // Increased row spacing
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No cycle data available.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 40; // Reduced space after table to 40 points
    
            // Period Length Trends - Table
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            const periodLengthData = [];
            if (menstrualData.length > 0) {
                const lastPeriods = menstrualData.slice(-6);
                lastPeriods.forEach((entry) => {
                    periodLengthData.push([
                        format(parseISO(entry.start_date), "MMM d, yyyy"),
                        format(parseISO(entry.end_date), "MMM d, yyyy"),
                        `${entry.period_length} days`,
                    ]);
                });
            }
            ensureHeadingAndTableFit("Period Length Trends", periodLengthData, [150, 150, 100], (pageWidth - 400) / 2);
            pdf.text("Period Length Trends", margin, yPosition);
            yPosition += 30; // Increased space below section heading
            addNewPageIfNeeded();
    
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            if (menstrualData.length > 0) {
                const lastPeriods = menstrualData.slice(-6);
                const tableData = lastPeriods.map((entry) => [
                    format(parseISO(entry.start_date), "MMM d, yyyy"),
                    format(parseISO(entry.end_date), "MMM d, yyyy"),
                    `${entry.period_length} days`,
                ]);
    
                // Table Header
                const headers = ["Start Date", "End Date", "No. of Days"].map(header => header.toUpperCase());
                const columnWidths = [150, 150, 100];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); // Very very light purple #f9f2fc
                pdf.setTextColor(0, 0, 0); // Black text for header
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); // Explicitly set light purple for each header cell
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // Table Rows
                pdf.setFillColor(255, 255, 255); // White
                pdf.setTextColor(0, 0, 0); // Black
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); // Explicitly set white for each row cell
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F");
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20);
                        pdf.text(cell, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; // Increased row spacing
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No period data available.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 40; // Increased space after table
    
            // Symptoms Logged by Cycle Day - Table
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            const symptomsData = [];
            if (response.data.symptoms_by_cycle_day && Object.keys(response.data.symptoms_by_cycle_day).length > 0) {
                symptomsData.push(...Object.entries(response.data.symptoms_by_cycle_day).map(([cycleDay, symptoms]) => [
                    `Cycle Day ${cycleDay}`,
                    symptoms.join(", "),
                ]));
            }
            ensureHeadingAndTableFit("Symptoms Logged by Cycle Day", symptomsData, [100, 300], (pageWidth - 400) / 2);
            pdf.text("Symptoms Logged by Cycle Day", margin, yPosition);
            yPosition += 30; // Increased space below section heading
            addNewPageIfNeeded();
    
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            if (response.data.symptoms_by_cycle_day && Object.keys(response.data.symptoms_by_cycle_day).length > 0) {
                const tableData = Object.entries(response.data.symptoms_by_cycle_day).map(([cycleDay, symptoms]) => [
                    `Cycle Day ${cycleDay}`,
                    symptoms.join(", "),
                ]);
    
                // Table Header
                const headers = ["Cycle Day", "Symptoms"].map(header => header.toUpperCase());
                const columnWidths = [100, 300];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); // Very very light purple #f9f2fc
                pdf.setTextColor(0, 0, 0); // Black text for header
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); // Explicitly set light purple for each header cell
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // Table Rows
                pdf.setFillColor(255, 255, 255); // White
                pdf.setTextColor(0, 0, 0); // Black
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); // Explicitly set white for each row cell
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F");
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20);
                        const cellLines = pdf.splitTextToSize(cell, columnWidths[colIndex] - 10);
                        pdf.text(cellLines, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; // Increased row spacing
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No symptoms logged.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 80; // Increased space after table to add more space before next section
    
            // Cycle Days Where Symptoms Are Likely to Appear - Table
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            const symptomRangesData = [];
            if (response.data.symptom_ranges && Object.keys(response.data.symptom_ranges).length > 0) {
                symptomRangesData.push(...Object.entries(response.data.symptom_ranges).map(([symptom, range]) => {
                    const rangeText = range.min_cycle_day === range.max_cycle_day
                        ? `On cycle day ${range.min_cycle_day}`
                        : `On cycle days ${range.min_cycle_day} to ${range.max_cycle_day}`;
                    return [symptom, rangeText];
                }));
            }
            ensureHeadingAndTableFit("Cycle Days Where Symptoms Are Likely to Appear", symptomRangesData, [150, 250], (pageWidth - 400) / 2);
            pdf.text("Cycle Days Where Symptoms Are Likely to Appear", margin, yPosition);
            yPosition += 30; // Increased space below section heading
            addNewPageIfNeeded();
    
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            if (response.data.symptom_ranges && Object.keys(response.data.symptom_ranges).length > 0) {
                const tableData = Object.entries(response.data.symptom_ranges).map(([symptom, range]) => {
                    const rangeText = range.min_cycle_day === range.max_cycle_day
                        ? `On cycle day ${range.min_cycle_day}`
                        : `On cycle days ${range.min_cycle_day} to ${range.max_cycle_day}`;
                    return [symptom, rangeText];
                });
    
                // Table Header
                const headers = ["Symptom", "Likely Cycle Days"].map(header => header.toUpperCase());
                const columnWidths = [150, 250];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); // Very very light purple #f9f2fc
                pdf.setTextColor(0, 0, 0); // Black text for header
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); // Explicitly set light purple for each header cell
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // Table Rows
                pdf.setFillColor(255, 255, 255); // White
                pdf.setTextColor(0, 0, 0); // Black
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); // Explicitly set white for each row cell
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F");
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20);
                        pdf.text(cell, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; // Increased row spacing
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No symptom range data available.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 40; // Increased space after table
    
            // Add logo to every page
            const logoImg = new Image();
            logoImg.src = "/images/logo.png";
            await new Promise((resolve) => {
                logoImg.onload = resolve;
                logoImg.onerror = () => {
                    console.error("Failed to load logo image");
                    resolve();
                };
            });
    
            const totalPages = pdf.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i); // Switch to the page
                pdf.addImage(logoImg, "PNG", pageWidth - margin - 50, pageHeight - margin - 50, 50, 50);
            }
    
            // Save the PDF
            pdf.save("symptom_report.pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleDownloadCSV = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const config = {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                },
            };
    
            // Fetch user data
            const userResponse = await axiosInstance.get("/users/users/auth-status/", config);
            const userName = userResponse.data.username || "User";
    
            // Fetch report data
            const response = await axiosInstance.get("/users/symptom-report/", config);
    
            // Prepare data arrays (same as in handleDownloadPDF)
            const cycleLengthData = [];
            if (menstrualData.length > 1) {
                const lastCycles = menstrualData.slice(-6);
                lastCycles.forEach((entry, index) => {
                    if (index === 0) return;
                    const prevEntry = lastCycles[index - 1];
                    const startDate = parseISO(prevEntry.start_date);
                    const endDate = parseISO(entry.start_date);
                    const cycleLength = differenceInDays(endDate, startDate);
                    cycleLengthData.push({
                        "Start Date": format(startDate, "MMM d, yyyy"),
                        "End Date": format(endDate, "MMM d, yyyy"),
                        "No. of Days": `${cycleLength} days`,
                    });
                });
            }
    
            const periodLengthData = [];
            if (menstrualData.length > 0) {
                const lastPeriods = menstrualData.slice(-6);
                lastPeriods.forEach((entry) => {
                    periodLengthData.push({
                        "Start Date": format(parseISO(entry.start_date), "MMM d, yyyy"),
                        "End Date": format(parseISO(entry.end_date), "MMM d, yyyy"),
                        "No. of Days": `${entry.period_length} days`,
                    });
                });
            }
    
            const symptomsData = [];
            if (response.data.symptoms_by_cycle_day && Object.keys(response.data.symptoms_by_cycle_day).length > 0) {
                symptomsData.push(...Object.entries(response.data.symptoms_by_cycle_day).map(([cycleDay, symptoms]) => ({
                    "Cycle Day": `Cycle Day ${cycleDay}`,
                    "Symptoms": symptoms.join(", "),
                })));
            }
    
            const symptomRangesData = [];
            if (response.data.symptom_ranges && Object.keys(response.data.symptom_ranges).length > 0) {
                symptomRangesData.push(...Object.entries(response.data.symptom_ranges).map(([symptom, range]) => {
                    const rangeText = range.min_cycle_day === range.max_cycle_day
                        ? `On cycle day ${range.min_cycle_day}`
                        : `On cycle days ${range.min_cycle_day} to ${range.max_cycle_day}`;
                    return {
                        "Symptom": symptom,
                        "Likely Cycle Days": rangeText,
                    };
                }));
            }
    
            // Prepare summary data
            const today = new Date();
            const formattedDateTime = format(today, "MMMM d, yyyy, h:mm a");
            const summaryData = [{
                "Name": userName,
                "Average Cycle Length (days)": `${avgCycleLength} days`,
                "Average Period Length (days)": `${avgPeriodLength} days`,
                "Date Generated": formattedDateTime,
            }];
    
            // Combine all data into a single CSV with section headers
            let csvContent = "=== Summary ===\n";
            csvContent += Papa.unparse(summaryData) + "\n\n";
    
            csvContent += "=== Cycle Length Trends ===\n";
            csvContent += Papa.unparse(cycleLengthData) + "\n\n";
    
            csvContent += "=== Period Length Trends ===\n";
            csvContent += Papa.unparse(periodLengthData) + "\n\n";
    
            csvContent += "=== Symptoms Logged by Cycle Day ===\n";
            csvContent += Papa.unparse(symptomsData) + "\n\n";
    
            csvContent += "=== Cycle Days Where Symptoms Are Likely to Appear ===\n";
            csvContent += Papa.unparse(symptomRangesData);
    
            // Create and download the CSV file
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "menstrual_cycle_report.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error generating CSV:", error);
            alert("Failed to generate CSV.");
        } finally {
            setLoading(false);
        }
    };
    

    const calculatePastCycleStats = () => {
        if (menstrualData.length < 2) {
          return {
            message: "Insufficient data to analyze past cycles",
            prevCycleLength: "N/A",
            prevPeriodLength: "N/A",
            variation: "N/A"
          };
        }
      
        const lastCycles = menstrualData.slice(-6); // Last 6 cycles
        const prevCycle = lastCycles[lastCycles.length - 1];
        const prevCycleLength = prevCycle.cycle_length || differenceInDays(
          parseISO(prevCycle.start_date),
          parseISO(lastCycles[lastCycles.length - 2].start_date)
        );
        const prevPeriodLength = prevCycle.period_length;
      
        // Calculate variation (standard deviation of cycle lengths)
        const cycleLengths = lastCycles.slice(1).map((cycle, index) => {
          const prevCycle = lastCycles[index];
          return differenceInDays(parseISO(cycle.start_date), parseISO(prevCycle.start_date));
        });
        
        const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
        const variance = cycleLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / cycleLengths.length;
        const variation = Math.sqrt(variance).toFixed(1);
      
        // Normal range for cycle length is typically 21-35 days
        // Normal variation is typically less than 7-9 days
        const isNormal = prevCycleLength >= 21 && prevCycleLength <= 35 && variation < 9;
      
        return {
          message: isNormal ? "Your past cycles seem to be on track ✔️" : "Your past cycles show some irregularity ❗",
          prevCycleLength,
          prevPeriodLength,
          variation
        };
      };

      return (
        <div className="menstrual-tracker-container">
          {/* Header separated for transparency */}
          <header className="tracker-header">
            <h1>{username ? `${username}'s Cycle Tracker` : "Cycle Tracker"}</h1>
          </header>
          {/* Main content below the background image */}
          <div className="tracker-main-content">
      <div className="tracker-content" style={{ display: 'flex', justifyContent: 'center' }}>
        {/* Left Section - Cycle Summary */}
        <div className="left-section" style={{ flex: '1' }}>
          <div className="cycle-summary">
          <h2>Cycle Summary <span role="img" aria-label="droplet">💧</span></h2>
            <div className="cycle-phase">
  <h3>
    You are currently in your{" "}
    <span className="phase-name" style={{ color: currentPhase.color }}>
      {currentPhase.name}
    </span>{" "}
    phase
  </h3>
  <progress
    value={currentCycleDay > 0 && typeof currentCycleDay === "number" ? currentCycleDay : 0}
    max={avgCycleLengthCalc}
    style={{ "--progress-color": currentPhase.color }}
  />
</div>
            <div className="summary-details">
            <div className="bubble">
      <strong>Days Remaining for Period:</strong>
      <span>{daysRemaining >= 0 ? daysRemaining : "N/A"}</span>
    </div>
    <div className="bubble">
      <strong>Current Cycle Day:</strong>
      <span>{currentCycleDay > 0 ? currentCycleDay : "N/A"}</span>
    </div>
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

        {/* Middle Section - Calendar */}
        <div className="middle-section" style={{ flex: '1' }}>
          <div className="calendar-section">
            <h2>{format(calendarDate, "MMMM yyyy")}</h2>
            <Calendar
              defaultView="month"
              value={calendarDate}
              onChange={(date) => setCalendarDate(date)}
              tileClassName={({ date }) => {
                const formattedDate = format(date, "yyyy-MM-dd");
                const classes = [];
                const dateMarks = markedDates[formattedDate] || [];

                if (dateMarks.includes("past-period")) classes.push("past-period-day");
                if (dateMarks.includes("predicted-period")) classes.push("predicted-period-day");
                if (dateMarks.includes("symptom-logged")) classes.push("symptom-logged-day");

                return classes.length > 0 ? classes : null;
              }}
              tileDisabled={() => false}
              onClickDay={(date) => {
                const formattedDate = format(date, "yyyy-MM-dd");
                const symptoms = symptomLogs.find(log => log.date === formattedDate)?.symptoms || [];
                setSelectedDateSymptoms({ date: formattedDate, symptoms });
              }}
            />
            <div className="calendar-buttons">
              <button className="log-period-btn" onClick={() => setShowPeriodModal(true)}>Log Period</button>
              <button className="log-symptoms-btn" onClick={() => setShowSymptomModal(true)}>Log Symptoms</button>
            </div>
          </div>
        </div>

{/* Right Section - Previous Cycle Stats */}
<div className="right-section" style={{ flex: '1'}}>
          <div className="cycle-stats">
            <h2>Previous Cycle Stats</h2>
            {(() => {
              const stats = calculatePastCycleStats();
              return (
                <>
                  <p className="stats-message">{stats.message}</p>
                  <div className="stats-details">
                    <div className="stat-item">
                      <span className="stat-name">Previous Cycle Length</span>
                      <span className="stat-value">{stats.prevCycleLength} days</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-name">Previous Period Length</span>
                      <span className="stat-value">{stats.prevPeriodLength} days</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-name">Cycle Variation (6 months)</span>
                      <span className="stat-value">{stats.variation} days</span>
                    </div>
                  </div>
                  <img src="/images/stats.jpg" alt="Cycle Stats Illustration" className="stats-image" />
                </>
              );
            })()}
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
                </div>
            </div>
            <div className="charts-section">
  <div className="chart">
    <h3>Cycle Length Trends</h3>
    {chartData.cycle && <Line data={chartData.cycle} options={cycleOptions} />}
  </div>
  <div className="chart period-length-chart"> {/* Added specific class */}
    <h3>Period Length Trends</h3>
    {chartData.period && <Bar data={chartData.period} options={periodOptions} />}
  </div>
</div>
            <div className="export-section">
  <h2>Export & Reports</h2>
  <p>
    Generate detailed reports of your menstrual cycle data for personal records or to share with your healthcare provider. 
    The <strong>PDF report</strong> includes a summary of your cycle history, average cycle and period lengths, and a detailed analysis of symptom trends.
    The <strong>CSV export</strong> provides raw data in a spreadsheet format, including dates, cycle lengths, period durations, and logged symptoms for easy analysis.
  </p>
  <div className="export-buttons">
    <button className="export-btn" onClick={handleDownloadPDF} disabled={loading}>
      {loading ? "Generating..." : "Download PDF Report"}
    </button>
    <button className="export-btn" onClick={handleDownloadCSV} disabled={loading}>
      {loading ? "Exporting..." : "Export Data as CSV"}
    </button>
  </div>
</div>
            {showPeriodModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Select Period Dates</h2>
                        <input
                            value={`${format(selectedRange[0].startDate, "MM/dd/yyyy")} to ${format(selectedRange[0].endDate, "MM/dd/yyyy")}`}
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
            {selectedDateSymptoms && (
            <div className="symptom-overlay">
                <div className="symptom-content">
                    <h3>Symptoms for {format(parseISO(selectedDateSymptoms.date), "MMMM d, yyyy")}</h3>
                    {selectedDateSymptoms.symptoms.length > 0 ? (
                        <ul>
                            {selectedDateSymptoms.symptoms.map((symptom, index) => (
                                <li key={index}>{symptom}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No symptoms logged for this date.</p>
                    )}
                    <button
                        className="log-symptoms-btn"
                        onClick={() => {
                            setShowSymptomModal(true);
                            setSelectedDateSymptoms(null);
                        }}
                    >
                        Log Symptoms
                    </button>
                    <button onClick={() => setSelectedDateSymptoms(null)}>Close</button>
                </div>
            </div>
        )}
    </div>
    </div>    
    );
}

export default MenstrualTracker;