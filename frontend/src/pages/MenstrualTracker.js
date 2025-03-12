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
import jsPDF from "jspdf";
import Papa from 'papaparse';

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
    <button className="export-btn" onClick={handleDownloadPDF} disabled={loading}>
        {loading ? "Generating..." : "Download PDF Report"}
    </button>
    <button className="export-btn" onClick={handleDownloadCSV} disabled={loading}>
        {loading ? "Exporting..." : "Export Data as CSV"}
    </button>
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