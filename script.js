// PROFESSIONAL EDC x MS - AI BRIEF REPORT JAVASCRIPT
// Version: v15.0 - Updated with Latest 30-Week Dataset (March 3 - September 22, 2025)
// Updated: Latest dataset from national_area_level_weekly.txt, product_level_weekly.txt, product_level_area_android.txt, and national_area_level_monthly.txt


// ==================== DATA MAPPING TABLES ====================

// Area mapping: Daily Order area -> Target area
const AREA_MAPPING = {
    'BALI NUSRA': 'East Indo',
    'KALIMANTAN': 'East Indo',
    'SULAWESI': 'East Indo',
    'JAKARTA': 'Java',
    'JAVA 1': 'Java',
    'JAVA 2': 'Java',
    'JAVA 3': 'Java',
    'SUMATERA 1': 'Sumatera',
    'SUMATERA 2': 'Sumatera',
    'SUMATERA 3': 'Sumatera'
};

// Regional groupings for aggregation
const REGIONAL_AREAS = {
    'East Indo': ['BALI NUSRA', 'KALIMANTAN', 'SULAWESI'],
    'Java': ['JAKARTA', 'JAVA 1', 'JAVA 2', 'JAVA 3'],
    'Sumatera': ['SUMATERA 1', 'SUMATERA 2', 'SUMATERA 3']
};

// Product mapping (consistent across both files)
const PRODUCT_MAPPING = {
    'L-PAY': 'L-Pay',
    'M-CASH': 'M-Cash',
    'Q-PAY': 'Q-Pay',
    'T-CASH':i: 'T-Cash'
};

// ==================== CHART REGISTRATION ====================
// Register Chart.js components and plugins
Chart.register(...Chart.controllers, ...Chart.scales, ...Chart.elements, ...Chart.plugins);
Chart.register(ChartDataLabels);
Chart.defaults.set('plugins.datalabels', {
    display: false
});

// ==================== GLOBAL VARIABLES ====================
// Global data stores
let mtdData = {};
let weeklyData = {};

// ==================== MAIN EXECUTION ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 EDC x MS AI Brief Report v16.0 Initializing...");

    // Set current date
    setDynamicDates();

    try {
        // Load and process data in parallel
        const [dailyOrders, weeklyTargets] = await Promise.all([
            loadDailyOrders("Monthly - Daily Order.json"),
            loadWeeklyTargets("Weekly - Raw Target.json")
        ]);

        // Process MTD data
        mtdData = buildMTDDataFromRaw(dailyOrders);
        console.log("📊 MTD Data Processed:", mtdData);

        // Process Weekly data
        weeklyData = buildWeeklyDataFromRaw(weeklyTargets);
        console.log("📈 Weekly Data Processed:", weeklyData);

        // --- Render Dashboard Sections ---

        // 1. MTD Scorecard
        renderMTDScorecard(mtdData);

        // 2. Weekly National Performance
        renderWeeklyNationalPerformance(weeklyData);

        // 3. Regional Deep Dive
        renderRegionalDeepDive(mtdData, weeklyData);

        // 4. Product Performance
        renderProductPerformance(mtdData, weeklyData);
        
        // 5. Executive Summary
        renderExecutiveSummary(mtdData, weeklyData);

        console.log("✅ Dashboard Rendered Successfully.");

    } catch (error) {
        console.error("❌ Critical Error during dashboard initialization:", error);
        displayGlobalError(error);
    }
});


// ==================== DATE FUNCTIONS ====================
function setDynamicDates() {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const currentDateElement = document.getElementById('currentDate');
    const execDateElement = document.getElementById('execDate');
    if (currentDateElement) currentDateElement.textContent = currentDate;
    if (execDateElement) execDateElement.textContent = currentDate;
}

// ==================== DATA LOADING FUNCTIONS ====================

/**
 * Loads and processes Monthly Daily Order data
 * @param {string} url - URL to the JSON file
 * @returns {Promise<Array>} - Processed daily order data
 */
async function loadDailyOrders(url) {
    const data = await fetchData(url);
    if (!data || !Array.isArray(data)) {
        throw new Error("Daily Order data is missing or not an array.");
    }
    
    return data.map(item => ({
        ...item,
        Date: new Date(item.Date),
        Orders: Number(item.Orders) || 0,
        Region: AREA_MAPPING[item.Area] || 'Unknown',
        Product: PRODUCT_MAPPING[item.Product] || item.Product
    }));
}

/**
 * Loads and processes Weekly Raw Target data
 * @param {string} url - URL to the JSON file
 * @returns {Promise<Array>} - Processed weekly target data
 */
async function loadWeeklyTargets(url) {
    const data = await fetchData(url);
    if (!data || !Array.isArray(data)) {
        throw new Error("Weekly Target data is missing or not an array.");
    }

    return data.map(item => ({
        ...item,
        Week: new Date(item.Week),
        Target: Number(item.Target) || 0,
        Achievement: Number(item.Achievement) || 0,
        Region: item.Area, // Target file uses 'Java', 'Sumatera', 'East Indo'
        Product: PRODUCT_MAPPING[item.Product] || item.Product
    }));
}

/**
 * Generic data fetching utility
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} - JSON response
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        throw error;
    }
}


// ==================== DATA PROCESSING FUNCTIONS ====================

/**
 * Builds aggregated MTD data from raw daily orders
 * @param {Array} dailyOrders - Processed daily order data
 * @returns {Object} - Aggregated MTD data
 */
function buildMTDDataFromRaw(dailyOrders) {
    const mtd = {
        national: { Orders: 0, M-Cash: 0, T-Cash: 0, Q-Pay: 0, 'L-Pay': 0 },
        regions: { Java: {}, Sumatera: {}, 'East Indo': {} },
        products: { 'M-Cash': {}, 'T-Cash': {}, 'Q-Pay': {}, 'L-Pay': {} }
    };

    // Initialize structures
    for (const region of Object.keys(REGIONAL_AREAS)) {
        mtd.regions[region] = { Orders: 0, 'M-Cash': 0, 'T-Cash': 0, 'Q-Pay': 0, 'L-Pay': 0 };
    }
    for (const product of Object.keys(PRODUCT_MAPPING)) {
        mtd.products[PRODUCT_MAPPING[product]] = { Orders: 0, Java: 0, Sumatera: 0, 'East Indo': 0 };
    }

    // Aggregate data
    for (const item of dailyOrders) {
        const region = item.Region;
        const product = item.Product;
        const orders = item.Orders;

        if (region !== 'Unknown') {
            // National total
            mtd.national.Orders += orders;
            
            // Regional total
            if (mtd.regions[region]) {
                mtd.regions[region].Orders += orders;
            }

            // Product aggregation
            if (product !== 'Unknown' && mtd.products[product]) {
                // National product total
                mtd.national[product] += orders;
                
                // Regional product total
                if (mtd.regions[region]) {
                    mtd.regions[region][product] += orders;
                }
                
                // Product-regional total
                mtd.products[product].Orders += orders;
                if (mtd.regions[region]) {
                    mtd.products[product][region] += orders;
                }
            }
        }
    }
    
    // Add national totals to product view
    for (const product of Object.keys(mtd.products)) {
        mtd.products[product].National = mtd.national[product];
    }
    
    return mtd;
}

/**
 * Builds aggregated Weekly data from raw weekly targets
 * @param {Array} weeklyTargets - Processed weekly target data
 * @returns {Object} - Aggregated Weekly data
 */
function buildWeeklyDataFromRaw(weeklyTargets) {
    const weekly = {
        national: { labels: [], targets: [], achievements: [], achievementPct: [] },
        regions: { Java: {}, Sumatera: {}, 'East Indo': {} },
        products: { 'M-Cash': {}, 'T-Cash': {}, 'Q-Pay': {}, 'L-Pay': {} }
    };

    const nationalAgg = {};

    // Initialize structures
    for (const region of Object.keys(REGIONAL_AREAS)) {
        weekly.regions[region] = { labels: [], targets: [], achievements: [], achievementPct: [] };
    }
    for (const product of Object.keys(PRODUCT_MAPPING)) {
        weekly.products[PRODUCT_MAPPING[product]] = { labels: [], targets: [], achievements: [], achievementPct: [] };
    }
    
    // Aggregate data
    for (const item of weeklyTargets) {
        const weekStr = item.Week.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const region = item.Region;
        const product = item.Product;

        // --- National Aggregation ---
        if (!nationalAgg[weekStr]) {
            nationalAgg[weekStr] = { Target: 0, Achievement: 0, Week: item.Week };
        }
        if (product === 'Orders') { // Only aggregate 'Orders' for national total
             nationalAgg[weekStr].Target += item.Target;
             nationalAgg[weekStr].Achievement += item.Achievement;
        }
       
        // --- Regional Aggregation ---
        if (region && weekly.regions[region] && product === 'Orders') {
            const regionData = weekly.regions[region];
            const weekIndex = regionData.labels.indexOf(weekStr);
            if (weekIndex === -1) {
                regionData.labels.push(weekStr);
                regionData.targets.push(item.Target);
                regionData.achievements.push(item.Achievement);
            } else {
                regionData.targets[weekIndex] += item.Target;
                regionData.achievements[weekIndex] += item.Achievement;
            }
        }

        // --- Product Aggregation ---
        if (product && weekly.products[product] && region === 'National') {
             const productData = weekly.products[product];
             const weekIndex = productData.labels.indexOf(weekStr);
             if (weekIndex === -1) {
                productData.labels.push(weekStr);
                productData.targets.push(item.Target);
                productData.achievements.push(item.Achievement);
            } else {
                productData.targets[weekIndex] += item.Target;
                productData.achievements[weekIndex] += item.Achievement;
            }
        }
    }

    // --- Finalize National Data ---
    const sortedWeeks = Object.values(nationalAgg).sort((a, b) => a.Week - b.Week);
    for (const week of sortedWeeks) {
        const weekStr = week.Week.toLocaleDateString('en-CA');
        const achPct = week.Target > 0 ? (week.Achievement / week.Target) * 100 : 0;
        weekly.national.labels.push(weekStr);
        weekly.national.targets.push(week.Target);
        weekly.national.achievements.push(week.Achievement);
        weekly.national.achievementPct.push(achPct);
    }
    
    // --- Finalize Regional & Product Pct ---
    for (const region of Object.keys(weekly.regions)) {
        const data = weekly.regions[region];
        data.achievementPct = data.targets.map((t, i) => t > 0 ? (data.achievements[i] / t) * 100 : 0);
    }
    for (const product of Object.keys(weekly.products)) {
        const data = weekly.products[product];
        data.achievementPct = data.targets.map((t, i) => t > 0 ? (data.achievements[i] / t) * 100 : 0);
    }

    return weekly;
}


// ==================== DASHBOARD RENDERING FUNCTIONS ====================

/**
 * Renders the MTD Scorecard section
 * @param {Object} mtd - MTD data object
 */
function renderMTDScorecard(mtd) {
    const national = mtd.national;
    const totalOrders = national.Orders;

    // Calculate percentages
    const mCashPct = totalOrders > 0 ? (national['M-Cash'] / totalOrders) * 100 : 0;
    const tCashPct = totalOrders > 0 ? (national['T-Cash'] / totalOrders) * 100 : 0;
    const qPayPct = totalOrders > 0 ? (national['Q-Pay'] / totalOrders) * 100 : 0;
    const lPayPct = totalOrders > 0 ? (national['L-Pay'] / totalOrders) * 100 : 0;

    // Render Metric Cards
    document.getElementById('mtd-total-orders').textContent = formatNumber(totalOrders);
    
    createMetricChart('mtd-mcash-chart', 'M-Cash', mCashPct, '#2563eb');
    createMetricChart('mtd-tcash-chart', 'T-Cash', tCashPct, '#16a34a');
    createMetricChart('mtd-qpay-chart', 'Q-Pay', qPayPct, '#db2777');
    createMetricChart('mtd-lpay-chart', 'L-Pay', lPayPct, '#f97316');
}

/**
 * Renders the Weekly National Performance section
 * @param {Object} weekly - Weekly data object
 */
function renderWeeklyNationalPerformance(weekly) {
    const national = weekly.national;
    
    // Get last 5 weeks for table
    const last5Labels = national.labels.slice(-5).reverse();
    const last5Targets = national.targets.slice(-5).reverse();
    const last5Ach = national.achievements.slice(-5).reverse();
    const last5Pct = national.achievementPct.slice(-5).reverse();

    // Populate table
    const tableBody = document.getElementById('weekly-national-table-body');
    tableBody.innerHTML = ''; // Clear existing
    for (let i = 0; i < last5Labels.length; i++) {
        const achPct = last5Pct[i];
        const row = `
            <tr>
                <td>${last5Labels[i]}</td>
                <td>${formatNumber(last5Targets[i])}</td>
                <td>${formatNumber(last5Ach[i])}</td>
                <td>
                    <span class="metric-change ${achPct >= 100 ? 'positive' : 'negative'}">
                        ${achPct.toFixed(1)}%
                    </span>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    }

    // Create chart
    createRealNationalWeeklyChart(national);
}

/**
 * Renders the Regional Deep Dive section
 * @param {Object} mtd - MTD data object
 * @param {Object} weekly - Weekly data object
 */
function renderRegionalDeepDive(mtd, weekly) {
    // MTD Regional Chart
    const mtdLabels = Object.keys(REGIONAL_AREAS);
    const mtdOrders = mtdLabels.map(r => mtd.regions[r].Orders);
    createRegionalBarChart('mtd-regional-chart', 'MTD Regional Order Contribution', mtdLabels, mtdOrders);

    // Weekly Regional Chart
    const weeklyJava = weekly.regions.Java.achievementPct.slice(-1)[0] || 0;
    const weeklySumatera = weekly.regions.Sumatera.achievementPct.slice(-1)[0] || 0;
    const weeklyEastIndo = weekly.regions['East Indo'].achievementPct.slice(-1)[0] || 0;
    
    createRegionalBarChart(
        'weekly-regional-chart', 
        'Latest Week Regional Achievement %', 
        mtdLabels, 
        [weeklyJava, weeklySumatera, weeklyEastIndo],
        true // isPercentage
    );
}

/**
 * Renders the Product Performance section
 * @param {Object} mtd - MTD data object
 * @param {Object} weekly - Weekly data object
 */
function renderProductPerformance(mtd, weekly) {
    // MTD Product Chart
    const mtdLabels = Object.keys(mtd.products);
    const mtdOrders = mtdLabels.map(p => mtd.products[p].National);
    createProductBarChart('mtd-product-chart', 'MTD Product Order Contribution', mtdLabels, mtdOrders);
    
    // Weekly Product Chart
    const weeklyMCash = weekly.products['M-Cash'].achievementPct.slice(-1)[0] || 0;
    const weeklyTCash = weekly.products['T-Cash'].achievementPct.slice(-1)[0] || 0;
    const weeklyQPay = weekly.products['Q-Pay'].achievementPct.slice(-1)[0] || 0;
    const weeklyLPay = weekly.products['L-Pay'].achievementPct.slice(-1)[0] || 0;

    createProductBarChart(
        'weekly-product-chart', 
        'Latest Week Product Achievement %', 
        mtdLabels, 
        [weeklyMCash, weeklyTCash, weeklyQPay, weeklyLPay],
        true // isPercentage
    );
}

/**
 * Renders the Executive Summary
 * @param {Object} mtdData 
 * @param {Object} weeklyData 
 */
function renderExecutiveSummary(mtd, weekly) {
    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = ''; // Clear loading...

    // 1. National Performance
    const lastWeek = weekly.national.achievementPct.slice(-1)[0] || 0;
    const prevWeek = weekly.national.achievementPct.slice(-2)[0] || 0;
    const trend = lastWeek - prevWeek;
    let nationalSummary = `<strong>National Performance:</strong> Latest weekly achievement is <strong>${lastWeek.toFixed(1)}%</strong>. `;
    if (trend > 0) {
        nationalSummary += `This is an <span class="positive">increase of ${trend.toFixed(1)}%</span> from the previous week.`;
    } else {
        nationalSummary += `This is a <span class="negative">decrease of ${Math.abs(trend).toFixed(1)}%</span> from the previous week.`;
    }
    addSummaryItem(nationalSummary);

    // 2. Top/Bottom Region
    const regions = ['Java', 'Sumatera', 'East Indo'].map(r => ({
        name: r,
        mtd: mtd.regions[r].Orders,
        weekly: weekly.regions[r].achievementPct.slice(-1)[0] || 0
    })).sort((a, b) => b.weekly - a.weekly);

    const topRegion = regions[0];
    const bottomRegion = regions[regions.length - 1];
    addSummaryItem(`<strong>Regional Highlight:</strong> <strong>${topRegion.name}</strong> is the top-performing region this week with <strong>${topRegion.weekly.toFixed(1)}%</strong> achievement. <strong>${bottomRegion.name}</strong> is trailing at <strong>${bottomRegion.weekly.toFixed(1)}%</strong>.`);

    // 3. Top/Bottom Product
    const products = ['M-Cash', 'T-Cash', 'Q-Pay', 'L-Pay'].map(p => ({
        name: p,
        mtd: mtd.products[p].National,
        weekly: weekly.products[p].achievementPct.slice(-1)[0] || 0
    })).sort((a, b) => b.weekly - a.weekly);
    
    const topProduct = products[0];
    const bottomProduct = products[products.length - 1];
    addSummaryItem(`<strong>Product Performance:</strong> <strong>${topProduct.name}</strong> leads product achievement at <strong>${topProduct.weekly.toFixed(1)}%</strong>, while <strong>${bottomProduct.name}</strong> is the lowest at <strong>${bottomProduct.weekly.toFixed(1)}%</strong>.`);

    // 4. MTD Contribution
    const mtdTotal = mtd.national.Orders;
    const topMtdRegion = Object.entries(mtd.regions).sort((a, b) => b[1].Orders - a[1].Orders)[0];
    const topMtdRegionPct = (topMtdRegion[1].Orders / mtdTotal) * 100;
    addSummaryItem(`<strong>MTD Contribution:</strong> <strong>${topMtdRegion[0]}</strong> remains the largest contributor to MTD orders, accounting for <strong>${topMtdRegionPct.toFixed(1)}%</strong> of the national total.`);
}

function addSummaryItem(html) {
    const li = document.createElement('li');
    li.innerHTML = html;
    document.getElementById('summary-list').appendChild(li);
}


// ==================== CHART CREATION FUNCTIONS ====================

/**
 * Creates a small metric bar chart for the MTD scorecard
 * @param {string} canvasId - ID of the canvas element
 * @param {string} label - Data label
 * @param {number} data - Percentage value
 * @param {string} color - Bar color
 */
function createMetricChart(canvasId, label, data, color) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [label],
            datasets: [{
                label: label,
                data: [data],
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    offset: -4,
                    color: '#ffffff', // Changed to white for contrast
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowBlur: 2,
                    font: {
                        weight: 'bold',
                        size: 14,
                    },
                    formatter: (value) => value.toFixed(1) + '%'
                }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }, // Hide X-axis grid lines
                    min: 0,
                    max: Math.max(100, data * 1.1) // Ensure max is at least 100
                },
                y: {
                    display: false,
                    grid: { display: false } // Hide Y-axis grid lines
                }
            },
        }
    });
}

/**
 * Creates the main Weekly National Performance chart
 * @param {Object} data - weekly.national data object
 */
function createRealNationalWeeklyChart(data) {
    const ctx = document.getElementById('realNationalWeeklyChart')?.getContext('2d');
    if (!ctx) return;

    const labels = data.labels;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Achievement %',
                    data: data.achievementPct,
                    borderColor: '#1e40af',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    yAxisID: 'y1',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#1e40af'
                },
                {
                    label: 'Achievement (Orders)',
                    data: data.achievements,
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    yAxisID: 'y',
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6',
                    borderDash: [5, 5]
                },
                {
                    label: 'Target (Orders)',
                    data: data.targets,
                    borderColor: '#94a3b8',
                    backgroundColor: 'transparent',
                    yAxisID: 'y',
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#94a3b8'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.yAxisID === 'y1') {
                                    label += context.parsed.y.toFixed(1) + '%';
                                } else {
                                    label += formatNumber(context.parsed.y);
                                }
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: function(context) {
                        // Only display the label for the last data point
                        return context.dataIndex === context.dataset.data.length - 1;
                    },
                    align: 'top',
                    offset: 8,
                    color: '#0f172a',
                    font: {
                        weight: '600',
                        size: 11
                    },
                    formatter: (value, context) => {
                         if (context.dataset.yAxisID === 'y1') {
                            return value.toFixed(1) + '%';
                        }
                        return formatNumber(value);
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: true,
                        maxRotation: 0,
                        font: { size: 11 }
                    }
                },
                y: { // Primary Y-axis (Orders)
                    type: 'linear',
                    position: 'left',
                    grid: {
                        color: '#e2e8f0',
                        borderDash: [2, 4]
                    },
                    ticks: {
                        callback: (value) => formatNumber(value),
                        font: { size: 11 }
                    },
                    title: {
                        display: true,
                        text: 'Orders (Volume)',
                        font: { weight: '600' }
                    }
                },
                y1: { // Secondary Y-axis (Percentage)
                    type: 'linear',
                    position: 'right',
                    grid: {
                        display: false // No grid lines for % axis
                    },
                    ticks: {
                        callback: (value) => value + '%',
                        font: { size: 11 }
                    },
                    title: {
                        display: true,
                        text: 'Achievement %',
                        font: { weight: '600' }
                    },
                    min: 0
                }
            }
        }
    });
}

/**
 * Creates a horizontal bar chart for regional data
 * @param {string} canvasId
 * @param {string} title
 * @param {Array} labels
 * @param {Array} data
 * @param {boolean} isPercentage - Formats ticks/tooltips as %
 */
function createRegionalBarChart(canvasId, title, labels, data, isPercentage = false) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    
    const colors = ['#2563eb', '#3b82f6', '#60a5fa'];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: colors,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: title, font: { size: 14, weight: '600' }, padding: { bottom: 15 } },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'end',
                    color: '#0f172a',
                    font: { weight: '600' },
                    formatter: (value) => isPercentage ? value.toFixed(1) + '%' : formatNumber(value)
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        callback: (value) => isPercentage ? value + '%' : formatNumber(value)
                    }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Creates a vertical bar chart for product data
 * @param {string} canvasId
 * @param {string} title
 * @param {Array} labels
 * @param {Array} data
 * @param {boolean} isPercentage - Formats ticks/tooltips as %
 */
function createProductBarChart(canvasId, title, labels, data, isPercentage = false) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    
    const colors = ['#2563eb', '#16a34a', '#db2777', '#f97316'];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: colors,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: title, font: { size: 14, weight: '600' }, padding: { bottom: 15 } },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    color: '#0f172a',
                    font: { weight: '600' },
                    formatter: (value) => isPercentage ? value.toFixed(1) + '%' : formatNumber(value)
                }
            },
            scales: {
                y: {
                    grid: { display: false },
                    ticks: {
                        callback: (value) => isPercentage ? value + '%' : formatNumber(value)
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}


// ==================== UTILITY FUNCTIONS ====================

/**
 * Formats a number with commas
 * @param {number} num
 * @returns {string} - Formatted number
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Toggles visibility of a dashboard section
 * @param {string} sectionId - ID of the section (e.g., 'mtd-scorecard')
 */
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const arrow = document.getElementById(sectionId + '-arrow');
    
    if (!content || !arrow) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.innerHTML = '▼'; // Down arrow
    } else {
        content.style.display = 'none';
        arrow.innerHTML = '▶'; // Right arrow
    }
}

/**
 * Displays a global error message in the dashboard
 * @param {Error} error - The error object
 */
function displayGlobalError(error) {
    const containers = document.querySelectorAll('.section-content');
    containers.forEach(container => {
        if (container.id !== 'exec-summary-content') { // Don't overwrite summary
            container.innerHTML = `
                <div style="padding: 20px; background: #fffbeB; border: 1px solid #fde68a; border-radius: 8px; color: #b45309;">
                    <h3 style="font-size: 1.2rem; font-weight: 600; color: #92400e; margin-bottom: 10px;">❌ Data Loading Failed</h3>
                    <p>There was a critical error while trying to load and process the dashboard data. Please check the following:</p>
                    <ul style="margin: 15px 0 0 20px; list-style-type: disc;">
                        <li>Ensure network access</li>
                        <li>Verify file paths: "Monthly - Daily Order.json", "Weekly - Raw Target.json"</li>
                        <li>Files contain valid JSON data</li>
                        <li>Check browser console (F12) for detailed error messages</li>
                    </ul>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 20px;">
                        <strong>Error Details:</strong><br>
                        <code style="color: #dc2626;">${error.message}</code>
                    </div>
                </div>
            ` + container.innerHTML;
        }
    });
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error(`❌ Global Error: ${e.message} at ${e.filename}:${e.lineno}`);
});

// Export professional analysis object with dynamic data loading
window.ProfessionalMSChannelAnalysis = {
    version: 'v16.1 - Fixed Dynamic Data Loading',
    // Data accessors
    get mtdData() { return window.mtdData; },
    get weeklyData() { return window.weeklyData; },
    // Dynamic data loading functions
    buildMTDDataFromRaw: buildMTDDataFromRaw,
    buildWeeklyDataFromRaw: buildWeeklyDataFromRaw,
    loadDailyOrders: loadDailyOrders,
    loadWeeklyTargets: loadWeeklyTargets,
    // Calculation functions
    calculateXmRMetrics: calculateXmRMetrics,
    detectAnomalies: detectAnomalies,
    // Chart creation functions
    createRealNationalWeeklyChart: createRealNationalWeeklyChart,
    createProfessionalMTDTable: createProfessionalMTDTable
};
