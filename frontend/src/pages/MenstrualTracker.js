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

    //fetch user
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

    //fetch data
    const fetchData = async () => {
        try {
            const response = await axiosInstance.get("/users/menstrual-data/");
            setMenstrualData(response.data);
        } catch (error) {
            console.error("Error fetching menstrual data:", error);
        }
    };

    //fetch symptoms
    const fetchSymptoms = async () => {
        try {
            const response = await axiosInstance.get("/users/symptom-logs/");
            setSymptomLogs(response.data);
        } catch (error) {
            console.error("Error fetching symptom logs:", error);
        }
    };

    //predictions
    const fetchPredictions = async () => {
        try {
            const response = await axiosInstance.get("/users/predict-cycle/");
            setPredictions(response.data.next_period_start ? response.data : null);
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    };

    //after logging symptoms
    const handleSymptomsLogged = (newLogs) => {
        setSymptomLogs((prev) => [...prev, ...newLogs]);
        toast.success("Symptoms logged successfully");
    };

    //hide on escape
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

    //save period
    const handleSavePeriod = async () => {
        const startDate = selectedRange[0].startDate;
        const endDate = selectedRange[0].endDate;
        
        // Close the modal first
        setShowPeriodModal(false);
      
        const toastId = toast(
          <div style={{ 
            textAlign: 'center',
            padding: '10px'
          }}>
            <p style={{
              color: '#333',
              marginBottom: '15px',
              fontSize: '15px',
              fontWeight: '500'
            }}>
              Are you sure you've selected the correct period dates?
            </p>
            <p style={{
              color: '#5e4b8b',
              marginBottom: '20px',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}
            </p>
            <div style={{ 
              display: 'flex',
              justifyContent: 'center',
              gap: '15px'
            }}>
              <button 
                onClick={() => {
                  toast.dismiss(toastId);
                  confirmSavePeriod();
                }}
                style={{
                  padding: '8px 20px',
                  background: '#ff6384',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#e04f70'}
                onMouseOut={(e) => e.target.style.background = '#ff6384'}
              >
                Confirm
              </button>
              <button 
                onClick={() => {
                  toast.dismiss(toastId);
                  setShowPeriodModal(true); // Reopen modal if canceled
                }}
                style={{
                  padding: '8px 20px',
                  background: 'transparent',
                  color: '#5e4b8b',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                Cancel
              </button>
            </div>
          </div>,
          {
            position: "top-center",
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            closeButton: false,
            style: {
              background: '#fff',
              width: '320px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            },
            bodyStyle: {
              padding: 0
            }
          }
        );
      };
      
      const confirmSavePeriod = async () => {
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
          fetchData();
          fetchPredictions();
        } catch (error) {
          console.error("Error saving period data:", error);
          toast.error("Failed to save period data");
          setShowPeriodModal(true); // Reopen modal if error occurs
        } finally {
          setLoading(false);
        }
      };

    //marked dates
    const getMarkedDates = () => {
        let markedDates = {};
        
        //past period dates
        menstrualData.forEach((entry) => {
            let currentDate = parseISO(entry.start_date);
            const endDate = parseISO(entry.end_date);
            while (currentDate <= endDate) {
                const formattedDate = format(currentDate, "yyyy-MM-dd");
                markedDates[formattedDate] = markedDates[formattedDate] || []; 
                markedDates[formattedDate].push("past-period"); 
                currentDate = addDays(currentDate, 1);
            }
        });
    
        //predicted period dates
        if (predictions?.next_period_start) {
            let currentDate = parseISO(predictions.next_period_start);
            const endDate = parseISO(predictions.next_period_end);
            while (currentDate <= endDate) {
                const formattedDate = format(currentDate, "yyyy-MM-dd");
                markedDates[formattedDate] = markedDates[formattedDate] || []; 
                markedDates[formattedDate].push("predicted-period"); 
                currentDate = addDays(currentDate, 1);
            }
        }
    
        //symptom-logged dates
        symptomLogs.forEach((entry) => {
            const formattedDate = entry.date;
            markedDates[formattedDate] = markedDates[formattedDate] || []; 
            markedDates[formattedDate].push("symptom-logged"); 
        });
    
        return markedDates;
    };

    const markedDates = getMarkedDates();

    const [chartData, setChartData] = useState({ cycle: null, period: null });

// charts
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
              backgroundColor: "#e6f0fa",
              barThickness: 40,
              borderWidth: 0, 
            },
            {
              label: "Period Length (Overlay)",
              data: periodData,
              backgroundColor: "#addbfa",
              barThickness: 20,
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
            legend: { display: false }, 
            tooltip: {
                enabled: true,
                callbacks: {
                    label: (context) => `${context.raw} days`,
                },
            },
        },
        elements: {
            bar: {
                borderRadius: 5, 
            },
        },
    };

    //avg period and cycle
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

    //recent symptoms
    const getRecentSymptoms = () => {
        const recentLogs = symptomLogs.slice(0, 5);
        const symptoms = recentLogs.flatMap(log => log.symptoms);
        return [...new Set(symptoms)].slice(0, 5);
    };
// last period
const latestPeriod = menstrualData.length > 0 ? menstrualData[menstrualData.length - 1] : null;
const rawCycleDay = latestPeriod
    ? differenceInDays(new Date(), parseISO(latestPeriod.start_date)) + 1
    : "N/A";
//days remaining for next period
    const daysRemaining = predictions?.next_period_start
        ? differenceInDays(parseISO(predictions.next_period_start), new Date())
        : "N/A";
//avg cycle length
const avgCycleLengthCalc = menstrualData.length
    ? menstrualData.reduce((sum, entry) => sum + (entry.cycle_length || 28), 0) / menstrualData.length
    : 28;
//current cycle day
const currentCycleDay = rawCycleDay !== "N/A" && daysRemaining !== "N/A" && daysRemaining < 0
    ? rawCycleDay % avgCycleLengthCalc || avgCycleLengthCalc 
    : rawCycleDay;

    //cal phase
    const getCyclePhase = (cycleDay, cycleLength) => {
        const phases = [
            { name: "Menstrual", start: 1, end: 5, color: "#ff6384" },
            { name: "Follicular", start: 6, end: Math.floor(cycleLength / 2), color: "#95d0f9" },
            { name: "Ovulation", start: Math.floor(cycleLength / 2) + 1, end: Math.floor(cycleLength / 2) + 3, color: "#ffe9b4" },
            { name: "Luteal", start: Math.floor(cycleLength / 2) + 4, end: cycleLength, color: "#ae9dd5" },
        ];
        if (cycleDay <= 0 || !cycleDay || typeof cycleDay === "string") return { name: "Unknown", color: "#ccc" };
       
        const adjustedCycleDay = cycleDay > cycleLength ? cycleDay % cycleLength || cycleLength : cycleDay;
        for (const phase of phases) {
            if (adjustedCycleDay >= phase.start && adjustedCycleDay <= phase.end) return phase;
        }
        return { name: "Unknown", color: "#ccc" };
    };
    
    const currentPhase = getCyclePhase(currentCycleDay, avgCycleLengthCalc);

    //pdf 
    const handleDownloadPDF = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const config = {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                },
            };
    
            const userResponse = await axiosInstance.get("/users/users/auth-status/", config);
            const userName = userResponse.data.username || "User";
    
            console.log("Fetching report with token:", token);
            const response = await axiosInstance.get("/users/symptom-report/", config);
            console.log("Fetched report data:", response.data);
    
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4",
            });
    
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 80; 
            let yPosition = margin;
    
            const addNewPageIfNeeded = () => {
                if (yPosition + 40 > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin; 
                }
            };
    
            const ensureHeadingAndTableFit = (headingText, tableData, columnWidths, tableX) => {
                const headingHeight = 30; 
                const headerRowHeight = 20;
                const dataRowHeight = 25; 
                const padding = 20; 
    
                const maxRows = Math.min(tableData.length, 6) + 1; 
                const tableHeight = headerRowHeight + (maxRows - 1) * dataRowHeight + padding;
    
                const totalHeight = headingHeight + tableHeight;
    
                if (yPosition + totalHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                }
            };
    //font and text 
            pdf.setFont("helvetica");
    
            pdf.setFontSize(20);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 0, 0); 
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
            yPosition += 60; 
    
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "normal");
            pdf.text(`Prepared for: ${userName}`, margin, yPosition);
            yPosition += 20; 
    //date time
            const today = new Date();
            const formattedDateTime = format(today, "MMMM d, yyyy, h:mm a");
            pdf.text(`Date Generated: ${formattedDateTime}`, margin, yPosition);
            yPosition += 40; 
    //avg cycle length and period length
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text(
                `Average Cycle Length: ${avgCycleLength} days | Average Period Length: ${avgPeriodLength} days`,
                pageWidth / 2,
                yPosition,
                { align: "center" }
            );
            yPosition += 60; 
    
            // table for cycle length trends
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
            yPosition += 30; 
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
                pdf.setDrawColor(224, 224, 224); 
    
                // table header
                const headers = ["Start Date", "End Date", "No. of Days"].map(header => header.toUpperCase());
                const columnWidths = [150, 150, 100];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); 
                pdf.setTextColor(0, 0, 0);
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); 
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // table rows
                pdf.setFillColor(255, 255, 255); 
                pdf.setTextColor(0, 0, 0); 
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); 
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F"); // Fixed: replaced 'index' with 'colIndex'
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20); // Fixed: replaced 'index' with 'colIndex'
                        pdf.text(cell, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; 
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No cycle data available.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 40; 
    
            // table for period length trends
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
            yPosition += 30; 
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
    
                // table header
                const headers = ["Start Date", "End Date", "No. of Days"].map(header => header.toUpperCase());
                const columnWidths = [150, 150, 100];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252);
                pdf.setTextColor(0, 0, 0); 
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); 
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // table rows
                pdf.setFillColor(255, 255, 255); 
                pdf.setTextColor(0, 0, 0); 
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); 
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F");
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20);
                        pdf.text(cell, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; 
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No period data available.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 40; 
    
            // table for symptoms logged by cycle day
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
            yPosition += 30; 
            addNewPageIfNeeded();
    
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            if (response.data.symptoms_by_cycle_day && Object.keys(response.data.symptoms_by_cycle_day).length > 0) {
                const tableData = Object.entries(response.data.symptoms_by_cycle_day).map(([cycleDay, symptoms]) => [
                    `Cycle Day ${cycleDay}`,
                    symptoms.join(", "),
                ]);
    
                // header tble
                const headers = ["Cycle Day", "Symptoms"].map(header => header.toUpperCase());
                const columnWidths = [100, 300];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); 
                pdf.setTextColor(0, 0, 0); 
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); 
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // table rows
                pdf.setFillColor(255, 255, 255);
                pdf.setTextColor(0, 0, 0); 
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F");
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20);
                        const cellLines = pdf.splitTextToSize(cell, columnWidths[colIndex] - 10);
                        pdf.text(cellLines, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; 
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No symptoms logged.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 80; 
    
            // table for when symptoms are likely to appear
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
            yPosition += 30; 
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
    
                // header table
                const headers = ["Symptom", "Likely Cycle Days"].map(header => header.toUpperCase());
                const columnWidths = [150, 250];
                const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
                const tableX = (pageWidth - tableWidth) / 2;
    
                pdf.setFillColor(249, 242, 252); 
                pdf.setTextColor(0, 0, 0); 
                headers.forEach((header, index) => {
                    pdf.setFillColor(249, 242, 252); 
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20, "F");
                    pdf.rect(tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, columnWidths[index], 20);
                    pdf.text(header, tableX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                });
                yPosition += 20;
    
                // table rows
                pdf.setFillColor(255, 255, 255); 
                pdf.setTextColor(0, 0, 0); 
                tableData.forEach((row) => {
                    row.forEach((cell, colIndex) => {
                        pdf.setFillColor(255, 255, 255); 
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20, "F");
                        pdf.rect(tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), yPosition, columnWidths[colIndex], 20);
                        pdf.text(cell, tableX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5, yPosition + 15);
                    });
                    yPosition += 25; 
                    addNewPageIfNeeded();
                });
            } else {
                pdf.text("No symptom range data available.", margin, yPosition);
                yPosition += 20;
            }
            yPosition += 40; 
    
            // Add logo 
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
                pdf.setPage(i); // switching pages
                pdf.addImage(logoImg, "PNG", pageWidth - margin - 50, pageHeight - margin - 50, 50, 50);
            }
    
            //save pdf
            pdf.save("symptom_report.pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF.");
        } finally {
            setLoading(false);
        }
    };
    
    //csv
    const handleDownloadCSV = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const config = {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                },
            };
    
            const userResponse = await axiosInstance.get("/users/users/auth-status/", config);
            const userName = userResponse.data.username || "User";
    
            // report data 
            const response = await axiosInstance.get("/users/symptom-report/", config);
    
            // prepare arrays 
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
    
            // prepare summary 
            const today = new Date();
            const formattedDateTime = format(today, "MMMM d, yyyy, h:mm a");
            const summaryData = [{
                "Name": userName,
                "Average Cycle Length (days)": `${avgCycleLength} days`,
                "Average Period Length (days)": `${avgPeriodLength} days`,
                "Date Generated": formattedDateTime,
            }];
    
            // combine all data with section headers
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
    
            // create and download the CSV file
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
    
    //past stats
    const calculatePastCycleStats = () => {
        if (menstrualData.length < 2) {
          return {
            message: "Insufficient data to analyze past cycles",
            prevCycleLength: "N/A",
            prevPeriodLength: "N/A",
            variation: "N/A"
          };
        }
      
        const lastCycles = menstrualData.slice(-6); // for the last 6 cycles
        const prevCycle = lastCycles[lastCycles.length - 1];
        const prevCycleLength = prevCycle.cycle_length || differenceInDays(
          parseISO(prevCycle.start_date),
          parseISO(lastCycles[lastCycles.length - 2].start_date)
        );
        const prevPeriodLength = prevCycle.period_length;
      
        const cycleLengths = lastCycles.slice(1).map((cycle, index) => {
          const prevCycle = lastCycles[index];
          return differenceInDays(parseISO(cycle.start_date), parseISO(prevCycle.start_date));
        });
        
        const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
        const variance = cycleLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / cycleLengths.length;
        const variation = Math.sqrt(variance).toFixed(1);
      
        // normal range for cycle length is 21-35 days
        // normal variation is less than 7-9 days
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
        
          <header className="tracker-header">
            <h1>{username ? `${username}'s Cycle Tracker` : "Cycle Tracker"}</h1>
          </header>
          {/* main content  */}
          <div className="tracker-main-content">
      <div className="tracker-content" style={{ display: 'flex', justifyContent: 'center' }}>
        {/* left section - sycle summary */}
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

        {/* middle section - calendar */}
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

{/* right section - previous cycle stats */}
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
      {/* insights */}
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
            {/* charts */}
            <div className="charts-section">
  <div className="chart">
    <h3>Cycle Length Trends</h3>
    {chartData.cycle && <Line data={chartData.cycle} options={cycleOptions} />}
  </div>
  <div className="chart period-length-chart"> 
    <h3>Period Length Trends</h3>
    {chartData.period && <Bar data={chartData.period} options={periodOptions} />}
  </div>
</div>
{/* exports */}
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