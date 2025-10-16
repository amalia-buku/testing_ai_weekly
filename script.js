// PROFESSIONAL EDC x MS - AI BRIEF REPORT JAVASCRIPT
// Version: v15.0 - Updated with Latest 30-Week Dataset (March 3 - September 22, 2025)
// Updated: Latest dataset from national_area_level_weekly.txt, product_level_weekly.txt, product_level_area_android.txt, and national_area_level_monthly.txt

// Last 30 weeks MS Channel data (March 3 - September 22, 2025) - Updated from national_area_level_weekly.txt


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
    'Android': 'Android',
    'Saku - Insurance': 'Saku - Insurance',
    'Saku - Non Insurance': 'Saku - Non Insurance'
};

// ==================== UPDATED FILE LOADING FUNCTIONS ====================

// Load and parse Daily Order JSON file using fetch()
async function loadDailyOrders() {
    try {
        console.log('📥 Fetching Extract - Daily Order.json...');
        const response = await fetch('Extract - Daily Order.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fileContent = await response.text();
        const lines = fileContent.trim().split('\n');
        const orders = lines.map(line => JSON.parse(line));
        console.log(`✅ Loaded ${orders.length} daily orders`);
        return orders;
    } catch (error) {
        console.error('❌ Error loading daily orders:', error);
        console.error('Make sure "Extract - Daily Order.json" file exists in your repository root');
        return [];
    }
}

// Load and parse Monthly Target JSON file using fetch()
async function loadMonthlyTargets() {
    try {
        console.log('📥 Fetching Monthly - Raw Target.json...');
        const response = await fetch('Monthly - Raw Target.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fileContent = await response.text();
        const lines = fileContent.trim().split('\n');
        const targets = lines.map(line => JSON.parse(line));
        console.log(`✅ Loaded ${targets.length} monthly targets`);
        return targets;
    } catch (error) {
        console.error('❌ Error loading monthly targets:', error);
        console.error('Make sure "Monthly - Raw Target.json" file exists in your repository root');
        return [];
    }
}

// Get current month and day dynamically
function getCurrentMonthDay() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = now.getDate();
    const currentMonth = `${year}-${month}-01`;
    
    // Calculate last month
    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastYear = lastMonthDate.getFullYear();
    const lastMonthNum = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const lastMonth = `${lastYear}-${lastMonthNum}-01`;
    
    return { currentMonth, lastMonth, currentDay: day };
}

// Filter and sum orders based on criteria
function getActualMTD(orders, targetMonth, upToDay, filters = {}) {
    return orders
        .filter(order => {
            // Filter by month
            if (order.paid_at_jkt_month !== targetMonth) return false;
            
            // Filter by day (MTD)
            const orderDay = parseInt(order.day_paid_at_jkt);
            if (orderDay > upToDay) return false;
            
            // Filter by area if specified
            if (filters.area && order.area !== filters.area) return false;
            
            // Filter by multiple areas if specified (for regional aggregation)
            if (filters.areas && !filters.areas.includes(order.area)) return false;
            
            // Filter by product if specified
            if (filters.product && order.clean_product_name !== filters.product) return false;
            
            return true;
        })
        .reduce((sum, order) => sum + parseInt(order.total_trx || 0), 0);
}

// Function in script.js (FIXED VERSION)
function getTargetMTD(targets, targetMonth, positionLevel, productLevel, area = null) {
    console.log(`🔍 Looking for target: Month=${targetMonth}, Level=${positionLevel}, Product=${productLevel}, Area=${area}`);

    // --- FIX 1: CORRECT POSITION LEVEL MAPPING ---
    // The script's 'Region' level is the Target file's 'Area' level (East Indo, Java, Sumatera).
    // The script's 'Area' level is the Target file's 'Region' level (Bali Nusra, Java 3, etc.).
    let actualPositionLevel = positionLevel;
    if (positionLevel === 'Region') {
        actualPositionLevel = 'Area'; 
    } else if (positionLevel === 'Area') {
        actualPositionLevel = 'Region'; 
    }
    // 'National' remains 'National', 'Area' becomes 'Region', 'Region' becomes 'Area'

    const match = targets.find(target => {
        // Month match
        if (target.month__ !== targetMonth) return false;

        // Position level match - use the corrected level
        if (target.position_level !== actualPositionLevel) return false;

        // Product level match
        if (target.product_level !== productLevel) return false;

        // Area match
        if (area) {
            let targetAreaName = area;
            
            // --- FIX 2: STANDARDIZE AREA NAME CASING ---
            // Daily Orders use UPPERCASE (e.g., 'JAVA 3').
            // Targets use Title Case (e.g., 'Java 3', 'Bali Nusra').
            if (actualPositionLevel === 'Region') {
                // This applies to individual areas (Java 1, Java 2, Bali Nusra, etc.)
                // 1. Convert to lower case: 'JAVA 3' -> 'java 3'
                targetAreaName = targetAreaName.toLowerCase();
                // 2. Convert first letter of each word to uppercase: 'java 3' -> 'Java 3', 'bali nusra' -> 'Bali Nusra'
                targetAreaName = targetAreaName.replace(/\b\w/g, c => c.toUpperCase());
                
            } else if (actualPositionLevel === 'Area') {
                // This applies to Super-Regions (East Indo, Java, Sumatera). 
                // The area parameter passed in the script here is already the correct super-region name.
                // We ensure it's Title Cased to match the JSON.
                targetAreaName = targetAreaName.charAt(0).toUpperCase() + targetAreaName.slice(1).toLowerCase();
            }
            
            if (target.area !== targetAreaName) return false;
        }

        return true;
    });

    if (match) {
        console.log(`   ✅ Found target: ${match.mtd_target}`);
        return parseFloat(match.mtd_target || 0);
    } else {
        console.log(`   ❌ No target found for ${area || 'National'} (Position Level: ${actualPositionLevel})`);
        return 0;
    }
}

// Calculate achievement percentage
function calculateAchievement(actual, target) {
    if (target === 0) return 0;
    return (actual / target) * 100;
}

// Calculate growth percentage
function calculateGrowth(currentMTD, lastMonthMTD) {
    if (lastMonthMTD === 0) return 0;
    return ((currentMTD - lastMonthMTD) / lastMonthMTD) * 100;
}
// Main function to build MTD data object from raw files
async function buildMTDDataFromRaw() {
    console.log('🚀 Building MTD data from raw JSON files...');
    
    const orders = await loadDailyOrders();
    const targets = await loadMonthlyTargets();
    // DEBUG: Check what targets were loaded
    console.log('🔍 Sample targets loaded:');
    console.log('National All Product:', targets.find(t => 
        t.position_level === 'National' && t.product_level === 'All Product'
    ));
    console.log('Region Java:', targets.find(t => 
        t.position_level === 'Region' && t.product_level === 'All Product' && t.area === 'Java'
    ));
    console.log('First 5 targets:', targets.slice(0, 5));
    const { currentMonth, lastMonth, currentDay } = getCurrentMonthDay();
    
    console.log(`📅 Current Month: ${currentMonth}, Day: ${currentDay}`);
    console.log(`📅 Last Month: ${lastMonth}`);
    
    const mtdData = {
        national: {},
        regions: {},
        areas: {},
        android_areas: {}
    };
    
    // 1. NATIONAL LEVEL - All Products
    const nationalActual = getActualMTD(orders, currentMonth, currentDay);
    const nationalTarget = getTargetMTD(targets, currentMonth, 'National', 'All Product');
    const nationalLastMonth = getActualMTD(orders, lastMonth, currentDay);
    
    mtdData.national['ALL PRODUCT - NATIONAL'] = {
        actual: nationalActual,
        target: nationalTarget,
        achievement: calculateAchievement(nationalActual, nationalTarget),
        last_month: nationalLastMonth,
        growth: calculateGrowth(nationalActual, nationalLastMonth)
    };
    
    // 2. NATIONAL LEVEL - By Product Type
    const productTypes = ['Android', 'Saku - Insurance', 'Saku - Non Insurance'];
    const productLabels = {
        'Android': 'ANDROID - NATIONAL',
        'Saku - Insurance': 'SAKU INSURANCE - NATIONAL',
        'Saku - Non Insurance': 'SAKU NON INSURANCE - NATIONAL'
    };
    
    productTypes.forEach(product => {
        const actual = getActualMTD(orders, currentMonth, currentDay, { product });
        const target = getTargetMTD(targets, currentMonth, 'National', product);
        const lastMonthActual = getActualMTD(orders, lastMonth, currentDay, { product });
        
        mtdData.national[productLabels[product]] = {
            actual,
            target,
            achievement: calculateAchievement(actual, target),
            last_month: lastMonthActual,
            growth: calculateGrowth(actual, lastMonthActual)
        };
    });
    
   // 3. REGIONAL LEVEL - Direct regional targets
const regionMappings = {
    'EAST REGION': 'East Indo',
    'JAVA REGION': 'Java', 
    'SUMATERA REGION': 'Sumatera'
};

const regionAreas = {
    'EAST REGION': ['BALI NUSRA', 'KALIMANTAN', 'SULAWESI'],
    'JAVA REGION': ['JAKARTA', 'JAVA 1', 'JAVA 2', 'JAVA 3'],
    'SUMATERA REGION': ['SUMATERA 1', 'SUMATERA 2', 'SUMATERA 3']
};

Object.entries(regionAreas).forEach(([regionName, areaList]) => {
    const actual = getActualMTD(orders, currentMonth, currentDay, { areas: areaList });
    
    // Try to find direct regional target
    const regionalTargetName = regionMappings[regionName];
    const directMatch = targets.find(t => 
        t.month__ === currentMonth &&
        t.position_level === 'Area' &&
        t.product_level === 'All Product' &&
        t.area === regionalTargetName
    );
    
    const target = directMatch ? parseFloat(directMatch.mtd_target) : 0;
    
    console.log(`🔍 ${regionName} target lookup:`, { regionalTargetName, directMatch, target });
    
    const lastMonthActual = getActualMTD(orders, lastMonth, currentDay, { areas: areaList });
    
    mtdData.regions[regionName] = {
        actual,
        target,
        achievement: calculateAchievement(actual, target),
        last_month: lastMonthActual,
        growth: calculateGrowth(actual, lastMonthActual)
    };
});
    // 4. AREA LEVEL - Individual Areas
    const allAreas = [
        'BALI NUSRA', 'JAKARTA', 'JAVA 1', 'JAVA 2', 'JAVA 3',
        'KALIMANTAN', 'SULAWESI', 'SUMATERA 1', 'SUMATERA 2', 'SUMATERA 3'
    ];

    allAreas.forEach(area => {
        const actual = getActualMTD(orders, currentMonth, currentDay, { area });
        const target = getTargetMTD(targets, currentMonth, 'Area', 'All Product', area); // ✅ FIXED: Changed 'Region' to 'Area'
        const lastMonthActual = getActualMTD(orders, lastMonth, currentDay, { area });
        
        mtdData.areas[area] = {
            actual,
            target,
            achievement: calculateAchievement(actual, target),
            last_month: lastMonthActual,
            growth: calculateGrowth(actual, lastMonthActual)
        };
    });
    
    // 5. ANDROID AREA LEVEL - Area × Android Product
    allAreas.forEach(area => {
        const actual = getActualMTD(orders, currentMonth, currentDay, { area, product: 'Android' });
        const target = getTargetMTD(targets, currentMonth, 'Area', 'Android', area); // ✅ FIXED: Changed 'Region' to 'Area'
        const lastMonthActual = getActualMTD(orders, lastMonth, currentDay, { area, product: 'Android' });
        
        mtdData.android_areas[`${area} ANDROID`] = {
            actual,
            target,
            achievement: calculateAchievement(actual, target),
            last_month: lastMonthActual,
            growth: calculateGrowth(actual, lastMonthActual)
        };
    });
    console.log('✅ MTD Data built successfully');
    console.log('📊 Sample National Data:', mtdData.national['ALL PRODUCT - NATIONAL']);
    
    return mtdData;
}

const realMSData = [
    { week: '3/3/2025', total_orders: 706 },
    { week: '3/10/2025', total_orders: 673 },
    { week: '3/17/2025', total_orders: 550 },
    { week: '3/24/2025', total_orders: 342 },
    { week: '3/31/2025', total_orders: 196 }, // EXCLUDED - Lebaran holiday
    { week: '4/7/2025', total_orders: 770 },
    { week: '4/14/2025', total_orders: 782 },
    { week: '4/21/2025', total_orders: 893 },
    { week: '4/28/2025', total_orders: 788 },
    { week: '5/5/2025', total_orders: 987 },
    { week: '5/12/2025', total_orders: 860 },
    { week: '5/19/2025', total_orders: 850 },
    { week: '5/26/2025', total_orders: 761 },
    { week: '6/2/2025', total_orders: 836 },
    { week: '6/9/2025', total_orders: 1026 },
    { week: '6/16/2025', total_orders: 1013 },
    { week: '6/23/2025', total_orders: 912 },
    { week: '6/30/2025', total_orders: 1122 },
    { week: '7/7/2025', total_orders: 1297 },
    { week: '7/14/2025', total_orders: 1200 },
    { week: '7/21/2025', total_orders: 1146 },
    { week: '7/28/2025', total_orders: 1147 },
    { week: '8/4/2025', total_orders: 1062 },
    { week: '8/11/2025', total_orders: 1659 },
    { week: '8/18/2025', total_orders: 1606 },
    { week: '8/25/2025', total_orders: 1213 },
    { week: '9/1/2025', total_orders: 1355 },
    { week: '9/8/2025', total_orders: 1636 },
    { week: '9/15/2025', total_orders: 1527 },
    { week: '9/22/2025', total_orders: 1541 }
];

// LEBARAN EXCLUSION: Updated for 30-week dataset (only 3/31/2025)
const lebaranExclusionIndices = [4]; // 0-based index for 3/31 only

// Filter function to exclude Lebaran holiday weeks
function createFilteredDataset(originalData, exclusionIndices = lebaranExclusionIndices) {
    return originalData.filter((item, index) => !exclusionIndices.includes(index));
}

// Create filtered datasets for XmR calculations (excluding Lebaran holidays)
const filteredMSData = createFilteredDataset(realMSData);
const filteredLabels = filteredMSData.map(d => d.week);
const filteredOrdersData = filteredMSData.map(d => d.total_orders);

// Original datasets for display (includes all data points with holiday markers)
const labels = realMSData.map(d => d.week);
const ordersData = realMSData.map(d => d.total_orders);

// Individual variable data for XmR analysis - Updated with 30 weeks (March 3 - September 22, 2025)
const individualVariableDataOriginal = {
    // Product data from product_level_weekly.txt (March 3 - September 22, 2025)
    android: [188, 148, 101, 75, 62, 183, 204, 222, 261, 329, 268, 211, 272, 335, 430, 418, 324, 416, 635, 593, 512, 484, 416, 783, 828, 568, 591, 741, 673, 714],
    sakuInsurance: [145, 102, 79, 44, 25, 106, 118, 157, 125, 243, 205, 202, 115, 135, 160, 157, 145, 157, 167, 168, 136, 155, 159, 309, 196, 152, 227, 209, 173, 159],
    sakuNonInsurance: [373, 423, 370, 223, 109, 481, 460, 514, 402, 415, 387, 437, 374, 366, 436, 438, 443, 549, 495, 439, 498, 508, 487, 567, 582, 493, 537, 686, 681, 668],

    // Area data from national_area_level_weekly.txt (March 3 - September 22, 2025)
    baliNusra: [30, 31, 25, 28, 13, 30, 29, 49, 31, 58, 47, 41, 45, 58, 69, 74, 45, 75, 82, 80, 66, 58, 32, 101, 128, 81, 89, 111, 99, 87],
    jakarta: [67, 65, 48, 24, 15, 82, 80, 84, 71, 100, 75, 60, 70, 55, 73, 85, 79, 83, 100, 100, 90, 106, 96, 94, 127, 80, 78, 101, 108, 114],
    java1: [77, 62, 57, 25, 13, 86, 62, 102, 92, 75, 65, 66, 63, 74, 95, 103, 84, 99, 103, 97, 101, 89, 60, 134, 130, 123, 127, 134, 107, 151],
    java2: [78, 68, 65, 36, 19, 79, 69, 97, 103, 116, 101, 94, 99, 80, 109, 102, 109, 146, 141, 139, 120, 119, 82, 192, 169, 132, 140, 176, 153, 146],
    java3: [50, 47, 40, 26, 9, 34, 43, 42, 41, 57, 51, 49, 41, 35, 44, 52, 57, 61, 77, 61, 66, 53, 66, 100, 110, 73, 71, 106, 78, 91],
    kalimantan: [35, 41, 35, 27, 19, 57, 51, 46, 42, 55, 53, 59, 33, 47, 59, 53, 44, 77, 87, 69, 80, 84, 94, 142, 110, 85, 123, 156, 128, 132],
    sulawesi: [138, 154, 105, 62, 47, 141, 195, 189, 169, 198, 179, 177, 170, 204, 252, 215, 189, 233, 273, 276, 227, 256, 229, 326, 291, 250, 271, 328, 312, 296],
    sumatera1: [105, 84, 79, 52, 32, 108, 104, 113, 84, 132, 125, 136, 111, 130, 153, 146, 147, 181, 215, 182, 197, 194, 190, 278, 224, 189, 209, 235, 248, 252],
    sumatera2: [47, 61, 40, 32, 11, 71, 53, 63, 56, 80, 75, 65, 49, 66, 65, 75, 53, 60, 100, 68, 84, 71, 89, 124, 119, 84, 103, 126, 115, 92],
    sumatera3: [79, 60, 56, 30, 18, 82, 96, 108, 99, 116, 89, 103, 80, 87, 107, 108, 105, 107, 119, 128, 115, 117, 124, 168, 198, 116, 144, 163, 179, 180]
};

// Android Area-Level Data (extracted from product_level_area_android.txt)
// 30 weeks from March 3 - September 22, 2025

const androidAreaDataOriginal = {
    // Android orders by area - actual data from product_level_area_android.txt
    androidBaliNusra: [6, 7, 12, 9, 3, 6, 11, 13, 11, 22, 11, 10, 14, 17, 27, 31, 21, 32, 42, 51, 29, 35, 14, 44, 66, 38, 39, 47, 39, 40],
    androidJakarta: [11, 5, 4, 2, 4, 13, 9, 14, 16, 13, 14, 10, 23, 13, 22, 26, 25, 20, 40, 44, 32, 38, 24, 38, 62, 20, 25, 31, 29, 36],
    androidJava1: [15, 10, 11, 5, 1, 15, 8, 17, 21, 26, 27, 14, 25, 22, 31, 42, 27, 35, 60, 37, 45, 42, 26, 58, 69, 51, 47, 49, 47, 66],
    androidJava2: [24, 14, 8, 14, 2, 15, 13, 19, 30, 40, 39, 25, 27, 25, 50, 38, 35, 55, 76, 62, 57, 50, 39, 92, 91, 64, 62, 89, 67, 72],
    androidJava3: [13, 7, 6, 3, 4, 9, 12, 10, 10, 25, 18, 10, 7, 16, 18, 20, 12, 15, 31, 26, 29, 14, 28, 46, 54, 38, 27, 50, 33, 43],
    androidKalimantan: [9, 10, 6, 3, 13, 21, 19, 10, 22, 25, 12, 16, 13, 16, 22, 25, 19, 33, 41, 29, 37, 29, 53, 67, 63, 36, 49, 64, 57, 55],
    androidSulawesi: [58, 49, 24, 19, 20, 57, 76, 76, 83, 80, 71, 65, 73, 111, 123, 116, 81, 109, 139, 155, 113, 125, 87, 175, 164, 143, 142, 167, 158, 151],
    androidSumatera1: [27, 22, 17, 11, 7, 21, 21, 30, 27, 44, 32, 33, 44, 49, 67, 45, 47, 56, 112, 95, 93, 71, 76, 118, 99, 86, 95, 102, 118, 124],
    androidSumatera2: [7, 12, 7, 4, 4, 11, 12, 9, 11, 21, 15, 12, 17, 29, 26, 24, 16, 22, 34, 28, 39, 25, 26, 61, 54, 35, 43, 66, 43, 44],
    androidSumatera3: [18, 12, 6, 5, 4, 15, 23, 24, 30, 33, 29, 16, 29, 37, 44, 51, 41, 39, 60, 66, 38, 55, 43, 84, 106, 57, 62, 76, 82, 83]
};

// Android Area Target Data (extracted from product_level_area_android.txt)
const androidAreaTargetData = {
    androidBaliNusra: [12, 12, 12, 10, 0, 9, 9, 11, 10, 19, 15, 19, 11, 13, 17, 17, 13, 17, 17, 17, 17, 22, 39, 39, 39, 39, 43, 54, 54, 54],
    androidJakarta: [25, 25, 25, 20, 0, 18, 18, 23, 18, 23, 18, 23, 14, 22, 27, 27, 22, 30, 31, 31, 31, 34, 44, 44, 44, 44, 50, 63, 63, 63],
    androidJava1: [19, 19, 19, 16, 0, 17, 17, 21, 17, 22, 18, 22, 13, 28, 35, 35, 28, 33, 36, 36, 36, 39, 51, 51, 51, 51, 60, 75, 75, 75],
    androidJava2: [19, 19, 19, 15, 0, 17, 17, 21, 17, 22, 18, 22, 13, 28, 35, 35, 28, 40, 41, 41, 41, 46, 64, 64, 64, 64, 72, 90, 90, 90],
    androidJava3: [16, 16, 16, 12, 0, 13, 13, 16, 13, 15, 12, 15, 9, 17, 21, 21, 17, 22, 22, 22, 22, 27, 44, 44, 44, 44, 49, 61, 61, 61],
    androidKalimantan: [8, 8, 8, 6, 0, 9, 9, 11, 10, 17, 14, 17, 10, 15, 19, 19, 15, 21, 22, 22, 22, 25, 39, 39, 39, 39, 51, 64, 64, 64],
    androidSulawesi: [36, 36, 36, 29, 0, 32, 32, 40, 36, 59, 47, 59, 35, 70, 88, 88, 70, 86, 86, 86, 86, 93, 119, 119, 119, 119, 126, 158, 158, 158],
    androidSumatera1: [25, 25, 25, 20, 0, 23, 23, 28, 23, 33, 26, 33, 20, 35, 44, 44, 35, 49, 50, 50, 50, 59, 93, 93, 93, 93, 98, 123, 123, 123],
    androidSumatera2: [14, 14, 14, 12, 0, 14, 14, 17, 14, 16, 13, 16, 10, 20, 25, 25, 20, 24, 24, 24, 24, 27, 39, 39, 39, 39, 46, 58, 58, 58],
    androidSumatera3: [24, 24, 24, 19, 0, 24, 24, 30, 23, 26, 21, 26, 16, 31, 39, 39, 31, 45, 46, 46, 46, 48, 56, 56, 56, 56, 69, 86, 86, 86]
};

// Create filtered Android area data (excluding Lebaran holidays)
const androidAreaDataFiltered = {};
Object.keys(androidAreaDataOriginal).forEach(key => {
    androidAreaDataFiltered[key] = createFilteredDataset(androidAreaDataOriginal[key]);
});

// Function to create all Android area XmR charts
function createAllAndroidAreaCharts() {
    console.log('🚀 Creating Android Area Breakdown XmR charts...');

    try {
        // Android BALI NUSRA Area
        const androidBaliNusraMetrics = calculateXmRMetrics(androidAreaDataOriginal.androidBaliNusra, androidAreaDataFiltered.androidBaliNusra, true);
        const androidBaliNusraAnalysis = detectAnomalies(androidAreaDataOriginal.androidBaliNusra, androidBaliNusraMetrics, lebaranExclusionIndices, "Android BALI NUSRA Orders");
        
        // Update metrics display
        const androidBaliNusraMetricsDiv = document.getElementById('androidBaliNusraMetrics');
        if (androidBaliNusraMetricsDiv) {
            androidBaliNusraMetricsDiv.innerHTML = `
                <span>Center: ${androidBaliNusraMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidBaliNusraMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidBaliNusraMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidBaliNusraMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidBaliNusraChart', androidAreaDataOriginal.androidBaliNusra, androidAreaDataFiltered.androidBaliNusra, androidBaliNusraMetrics, androidBaliNusraAnalysis.pointColors, 'Android BALI NUSRA Orders', 'androidBaliNusraAlerts', androidAreaTargetData.androidBaliNusra);
        createProfessionalMRChart('androidBaliNusraMRChart', androidBaliNusraMetrics.movingRanges, androidBaliNusraMetrics);

        // Android JAKARTA Area
        const androidJakartaMetrics = calculateXmRMetrics(androidAreaDataOriginal.androidJakarta, androidAreaDataFiltered.androidJakarta, true);
        const androidJakartaAnalysis = detectAnomalies(androidAreaDataOriginal.androidJakarta, androidJakartaMetrics, lebaranExclusionIndices, "Android JAKARTA Orders");
        
        const androidJakartaMetricsDiv = document.getElementById('androidJakartaMetrics');
        if (androidJakartaMetricsDiv) {
            androidJakartaMetricsDiv.innerHTML = `
                <span>Center: ${androidJakartaMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidJakartaMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidJakartaMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidJakartaMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidJakartaChart', androidAreaDataOriginal.androidJakarta, androidAreaDataFiltered.androidJakarta, androidJakartaMetrics, androidJakartaAnalysis.pointColors, 'Android JAKARTA Orders', 'androidJakartaAlerts', androidAreaTargetData.androidJakarta);
        createProfessionalMRChart('androidJakartaMRChart', androidJakartaMetrics.movingRanges, androidJakartaMetrics);

        // Android JAVA 1 Area
        const androidJava1Metrics = calculateXmRMetrics(androidAreaDataOriginal.androidJava1, androidAreaDataFiltered.androidJava1, true);
        const androidJava1Analysis = detectAnomalies(androidAreaDataOriginal.androidJava1, androidJava1Metrics, lebaranExclusionIndices, "Android JAVA 1 Orders");
        
        const androidJava1MetricsDiv = document.getElementById('androidJava1Metrics');
        if (androidJava1MetricsDiv) {
            androidJava1MetricsDiv.innerHTML = `
                <span>Center: ${androidJava1Metrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidJava1Metrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidJava1Metrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidJava1Metrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidJava1Chart', androidAreaDataOriginal.androidJava1, androidAreaDataFiltered.androidJava1, androidJava1Metrics, androidJava1Analysis.pointColors, 'Android JAVA 1 Orders', 'androidJava1Alerts', androidAreaTargetData.androidJava1);
        createProfessionalMRChart('androidJava1MRChart', androidJava1Metrics.movingRanges, androidJava1Metrics);

        // Android JAVA 2 Area
        const androidJava2Metrics = calculateXmRMetrics(androidAreaDataOriginal.androidJava2, androidAreaDataFiltered.androidJava2, true);
        const androidJava2Analysis = detectAnomalies(androidAreaDataOriginal.androidJava2, androidJava2Metrics, lebaranExclusionIndices, "Android JAVA 2 Orders");
        
        const androidJava2MetricsDiv = document.getElementById('androidJava2Metrics');
        if (androidJava2MetricsDiv) {
            androidJava2MetricsDiv.innerHTML = `
                <span>Center: ${androidJava2Metrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidJava2Metrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidJava2Metrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidJava2Metrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidJava2Chart', androidAreaDataOriginal.androidJava2, androidAreaDataFiltered.androidJava2, androidJava2Metrics, androidJava2Analysis.pointColors, 'Android JAVA 2 Orders', 'androidJava2Alerts', androidAreaTargetData.androidJava2);
        createProfessionalMRChart('androidJava2MRChart', androidJava2Metrics.movingRanges, androidJava2Metrics);

        // Android JAVA 3 Area
        const androidJava3Metrics = calculateXmRMetrics(androidAreaDataOriginal.androidJava3, androidAreaDataFiltered.androidJava3, true);
        const androidJava3Analysis = detectAnomalies(androidAreaDataOriginal.androidJava3, androidJava3Metrics, lebaranExclusionIndices, "Android JAVA 3 Orders");
        
        const androidJava3MetricsDiv = document.getElementById('androidJava3Metrics');
        if (androidJava3MetricsDiv) {
            androidJava3MetricsDiv.innerHTML = `
                <span>Center: ${androidJava3Metrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidJava3Metrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidJava3Metrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidJava3Metrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidJava3Chart', androidAreaDataOriginal.androidJava3, androidAreaDataFiltered.androidJava3, androidJava3Metrics, androidJava3Analysis.pointColors, 'Android JAVA 3 Orders', 'androidJava3Alerts', androidAreaTargetData.androidJava3);
        createProfessionalMRChart('androidJava3MRChart', androidJava3Metrics.movingRanges, androidJava3Metrics);

        // Android KALIMANTAN Area
        const androidKalimantanMetrics = calculateXmRMetrics(androidAreaDataOriginal.androidKalimantan, androidAreaDataFiltered.androidKalimantan, true);
        const androidKalimantanAnalysis = detectAnomalies(androidAreaDataOriginal.androidKalimantan, androidKalimantanMetrics, lebaranExclusionIndices, "Android KALIMANTAN Orders");
        
        const androidKalimantanMetricsDiv = document.getElementById('androidKalimantanMetrics');
        if (androidKalimantanMetricsDiv) {
            androidKalimantanMetricsDiv.innerHTML = `
                <span>Center: ${androidKalimantanMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidKalimantanMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidKalimantanMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidKalimantanMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidKalimantanChart', androidAreaDataOriginal.androidKalimantan, androidAreaDataFiltered.androidKalimantan, androidKalimantanMetrics, androidKalimantanAnalysis.pointColors, 'Android KALIMANTAN Orders', 'androidKalimantanAlerts', androidAreaTargetData.androidKalimantan);
        createProfessionalMRChart('androidKalimantanMRChart', androidKalimantanMetrics.movingRanges, androidKalimantanMetrics);

        // Android SULAWESI Area
        const androidSulawesiMetrics = calculateXmRMetrics(androidAreaDataOriginal.androidSulawesi, androidAreaDataFiltered.androidSulawesi, true);
        const androidSulawesiAnalysis = detectAnomalies(androidAreaDataOriginal.androidSulawesi, androidSulawesiMetrics, lebaranExclusionIndices, "Android SULAWESI Orders");
        
        const androidSulawesiMetricsDiv = document.getElementById('androidSulawesiMetrics');
        if (androidSulawesiMetricsDiv) {
            androidSulawesiMetricsDiv.innerHTML = `
                <span>Center: ${androidSulawesiMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidSulawesiMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidSulawesiMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidSulawesiMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidSulawesiChart', androidAreaDataOriginal.androidSulawesi, androidAreaDataFiltered.androidSulawesi, androidSulawesiMetrics, androidSulawesiAnalysis.pointColors, 'Android SULAWESI Orders', 'androidSulawesiAlerts', androidAreaTargetData.androidSulawesi);
        createProfessionalMRChart('androidSulawesiMRChart', androidSulawesiMetrics.movingRanges, androidSulawesiMetrics);

        // Android SUMATERA 1 Area
        const androidSumatera1Metrics = calculateXmRMetrics(androidAreaDataOriginal.androidSumatera1, androidAreaDataFiltered.androidSumatera1, true);
        const androidSumatera1Analysis = detectAnomalies(androidAreaDataOriginal.androidSumatera1, androidSumatera1Metrics, lebaranExclusionIndices, "Android SUMATERA 1 Orders");
        
        const androidSumatera1MetricsDiv = document.getElementById('androidSumatera1Metrics');
        if (androidSumatera1MetricsDiv) {
            androidSumatera1MetricsDiv.innerHTML = `
                <span>Center: ${androidSumatera1Metrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidSumatera1Metrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidSumatera1Metrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidSumatera1Metrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidSumatera1Chart', androidAreaDataOriginal.androidSumatera1, androidAreaDataFiltered.androidSumatera1, androidSumatera1Metrics, androidSumatera1Analysis.pointColors, 'Android SUMATERA 1 Orders', 'androidSumatera1Alerts', androidAreaTargetData.androidSumatera1);
        createProfessionalMRChart('androidSumatera1MRChart', androidSumatera1Metrics.movingRanges, androidSumatera1Metrics);

        // Android SUMATERA 2 Area
        const androidSumatera2Metrics = calculateXmRMetrics(androidAreaDataOriginal.androidSumatera2, androidAreaDataFiltered.androidSumatera2, true);
        const androidSumatera2Analysis = detectAnomalies(androidAreaDataOriginal.androidSumatera2, androidSumatera2Metrics, lebaranExclusionIndices, "Android SUMATERA 2 Orders");
        
        const androidSumatera2MetricsDiv = document.getElementById('androidSumatera2Metrics');
        if (androidSumatera2MetricsDiv) {
            androidSumatera2MetricsDiv.innerHTML = `
                <span>Center: ${androidSumatera2Metrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidSumatera2Metrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidSumatera2Metrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidSumatera2Metrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidSumatera2Chart', androidAreaDataOriginal.androidSumatera2, androidAreaDataFiltered.androidSumatera2, androidSumatera2Metrics, androidSumatera2Analysis.pointColors, 'Android SUMATERA 2 Orders', 'androidSumatera2Alerts', androidAreaTargetData.androidSumatera2);
        createProfessionalMRChart('androidSumatera2MRChart', androidSumatera2Metrics.movingRanges, androidSumatera2Metrics);

        // Android SUMATERA 3 Area
        const androidSumatera3Metrics = calculateXmRMetrics(androidAreaDataOriginal.androidSumatera3, androidAreaDataFiltered.androidSumatera3, true);
        const androidSumatera3Analysis = detectAnomalies(androidAreaDataOriginal.androidSumatera3, androidSumatera3Metrics, lebaranExclusionIndices, "Android SUMATERA 3 Orders");
        
        const androidSumatera3MetricsDiv = document.getElementById('androidSumatera3Metrics');
        if (androidSumatera3MetricsDiv) {
            androidSumatera3MetricsDiv.innerHTML = `
                <span>Center: ${androidSumatera3Metrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${androidSumatera3Metrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${androidSumatera3Metrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${androidSumatera3Metrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }
        
        createProfessionalChart('androidSumatera3Chart', androidAreaDataOriginal.androidSumatera3, androidAreaDataFiltered.androidSumatera3, androidSumatera3Metrics, androidSumatera3Analysis.pointColors, 'Android SUMATERA 3 Orders', 'androidSumatera3Alerts', androidAreaTargetData.androidSumatera3);
        createProfessionalMRChart('androidSumatera3MRChart', androidSumatera3Metrics.movingRanges, androidSumatera3Metrics);

        console.log('✅ All Android area XmR charts created successfully');
    } catch (error) {
        console.error('❌ Error creating Android area charts:', error);
    }
}

// Regional Data Aggregation
const regionalDataOriginal = {
    // East Region: Bali Nusra + Kalimantan + Sulawesi
    eastRegion: individualVariableDataOriginal.baliNusra.map((val, i) =>
        val + individualVariableDataOriginal.kalimantan[i] + individualVariableDataOriginal.sulawesi[i]
    ),
    // Java Region: Jakarta + Java 1 + Java 2 + Java 3  
    javaRegion: individualVariableDataOriginal.jakarta.map((val, i) =>
        val + individualVariableDataOriginal.java1[i] + individualVariableDataOriginal.java2[i] + individualVariableDataOriginal.java3[i]
    ),
    // Sumatera Region: Sumatera 1 + Sumatera 2 + Sumatera 3
    sumateraRegion: individualVariableDataOriginal.sumatera1.map((val, i) =>
        val + individualVariableDataOriginal.sumatera2[i] + individualVariableDataOriginal.sumatera3[i]
    )
};

// Target data extracted from national_area_level_weekly.txt and product_level_weekly.txt (30 weeks)
const targetData = {
    // NATIONAL LEVEL TARGETS - from national_area_level_weekly.txt
    totalOrders: [816, 816, 816, 653, 0, 800, 800, 1000, 794, 971, 777, 971, 583, 765, 956, 956, 765, 1027, 1045, 1045, 1045, 1085, 1243, 1243, 1243, 1243, 1326, 1657, 1657, 1657],

    // PRODUCT LEVEL TARGETS - from product_level_weekly.txt  
    android: [197, 197, 197, 158, 0, 175, 175, 219, 182, 253, 202, 253, 152, 268, 335, 335, 268, 368, 376, 376, 376, 418, 588, 588, 588, 588, 664, 830, 830, 830],
    sakuInsurance: [155, 155, 155, 124, 0, 156, 156, 194, 153, 180, 144, 180, 108, 164, 205, 205, 164, 202, 201, 201, 201, 200, 196, 196, 196, 196, 188, 235, 235, 235],
    sakuNonInsurance: [464, 464, 464, 371, 0, 470, 470, 587, 460, 538, 431, 538, 323, 333, 416, 416, 333, 458, 468, 468, 468, 466, 459, 459, 459, 459, 473, 592, 592, 592],

    // AREA LEVEL TARGETS - from national_area_level_weekly.txt
    baliNusra: [52, 52, 52, 41, 0, 40, 40, 50, 43, 66, 53, 66, 40, 47, 58, 58, 47, 64, 65, 65, 65, 67, 74, 74, 74, 74, 86, 107, 107, 107],
    jakarta: [102, 102, 102, 82, 0, 84, 84, 105, 82, 96, 76, 96, 57, 71, 88, 88, 71, 87, 87, 87, 87, 89, 99, 99, 99, 99, 100, 125, 125, 125],
    java1: [81, 81, 81, 64, 0, 77, 77, 97, 77, 96, 76, 96, 57, 55, 69, 69, 55, 93, 99, 99, 99, 100, 105, 105, 105, 105, 119, 149, 149, 149],
    java2: [78, 78, 78, 62, 0, 76, 76, 95, 76, 94, 75, 94, 56, 78, 97, 97, 78, 111, 115, 115, 115, 119, 133, 133, 133, 133, 143, 179, 179, 179],
    java3: [64, 64, 64, 51, 0, 59, 59, 74, 58, 67, 53, 67, 40, 51, 64, 64, 51, 62, 62, 62, 62, 68, 94, 94, 94, 94, 97, 121, 121, 121],
    kalimantan: [33, 33, 33, 26, 0, 39, 39, 49, 41, 58, 47, 58, 35, 47, 58, 58, 47, 64, 66, 66, 66, 70, 88, 88, 88, 88, 102, 128, 128, 128],
    sulawesi: [148, 148, 148, 118, 0, 148, 148, 184, 147, 183, 146, 183, 110, 155, 194, 194, 155, 213, 217, 217, 217, 224, 252, 252, 252, 252, 253, 316, 316, 316],
    sumatera1: [102, 102, 102, 81, 0, 103, 103, 129, 104, 134, 107, 134, 80, 107, 133, 133, 107, 138, 139, 139, 139, 150, 195, 195, 195, 195, 196, 245, 245, 245],
    sumatera2: [59, 59, 59, 48, 0, 63, 63, 79, 61, 70, 56, 70, 42, 60, 75, 75, 60, 68, 66, 66, 66, 70, 84, 84, 84, 84, 92, 115, 115, 115],
    sumatera3: [97, 97, 97, 78, 0, 110, 110, 138, 104, 108, 86, 108, 65, 95, 118, 118, 95, 127, 129, 129, 129, 127, 119, 119, 119, 119, 138, 172, 172, 172]
};

// Regional Target Data Aggregation
const regionalTargetData = {
    // East Region targets: Bali Nusra + Kalimantan + Sulawesi
    eastRegion: targetData.baliNusra.map((val, i) =>
        val + targetData.kalimantan[i] + targetData.sulawesi[i]
    ),
    // Java Region targets: Jakarta + Java 1 + Java 2 + Java 3
    javaRegion: targetData.jakarta.map((val, i) =>
        val + targetData.java1[i] + targetData.java2[i] + targetData.java3[i]
    ),
    // Sumatera Region targets: Sumatera 1 + Sumatera 2 + Sumatera 3
    sumateraRegion: targetData.sumatera1.map((val, i) =>
        val + targetData.sumatera2[i] + targetData.sumatera3[i]
    )
};

// ==================== MTD DATA (NOW DYNAMIC) ====================
// MTD data will be loaded dynamically from raw JSON files
let mtdData = null;

// Data Verification and Consistency Checks
console.log('📊 VERIFICATION: Checking 30-week data consistency...');

// Latest week verification (September 22, 2025)
const latestWeekIndex = ordersData.length - 1;
const latestWeekTotal = ordersData[latestWeekIndex];

// Product breakdown verification for latest week
const latestProductTotal = individualVariableDataOriginal.android[latestWeekIndex] + 
                          individualVariableDataOriginal.sakuInsurance[latestWeekIndex] + 
                          individualVariableDataOriginal.sakuNonInsurance[latestWeekIndex];
console.log(`Latest Week Product Total: ${latestProductTotal} vs National: ${latestWeekTotal} ${latestProductTotal === latestWeekTotal ? '✅' : '❌'}`);

// Area breakdown verification for latest week
const latestAreaTotal = Object.keys(individualVariableDataOriginal)
    .filter(key => !['android', 'sakuInsurance', 'sakuNonInsurance'].includes(key))
    .reduce((sum, key) => sum + individualVariableDataOriginal[key][latestWeekIndex], 0);
console.log(`Latest Week Area Total: ${latestAreaTotal} vs National: ${latestWeekTotal} ${latestAreaTotal === latestWeekTotal ? '✅' : '❌'}`);

// Regional breakdown verification for latest week
const latestRegionalTotal = regionalDataOriginal.eastRegion[latestWeekIndex] + 
                           regionalDataOriginal.javaRegion[latestWeekIndex] + 
                           regionalDataOriginal.sumateraRegion[latestWeekIndex];
console.log(`Latest Week Regional Total: ${latestRegionalTotal} vs National: ${latestWeekTotal} ${latestRegionalTotal === latestWeekTotal ? '✅' : '❌'}`);

// MTD Data Verification - MOVED TO ASYNC FUNCTION
async function verifyMTDData() {
    console.log('🔍 Verifying MTD Data...');
    
    if (!mtdData) {
        console.warn('⚠️ MTD data not loaded yet');
        return;
    }
    
    console.log('📊 MTD Data structure:', {
        hasNational: !!mtdData.national,
        hasRegions: !!mtdData.regions,
        hasAreas: !!mtdData.areas,
        hasAndroidAreas: !!mtdData.android_areas
    });
    
    // Check if required data exists
    if (!mtdData.national || !mtdData.national['ALL PRODUCT - NATIONAL']) {
        console.error('❌ National data is missing or incomplete');
        console.log('Available keys:', Object.keys(mtdData.national || {}));
        return;
    }
    
    try {
        const mtdProductTotal = mtdData.national['ANDROID - NATIONAL'].actual + 
                               mtdData.national['SAKU INSURANCE - NATIONAL'].actual + 
                               mtdData.national['SAKU NON INSURANCE - NATIONAL'].actual;
        const mtdNationalTotal = mtdData.national['ALL PRODUCT - NATIONAL'].actual;
        console.log(`MTD Product Total: ${mtdProductTotal} vs National: ${mtdNationalTotal} ${mtdProductTotal === mtdNationalTotal ? '✅' : '❌'}`);

        const mtdAreaTotal = Object.values(mtdData.areas).reduce((sum, area) => sum + area.actual, 0);
        console.log(`MTD Area Total: ${mtdAreaTotal} vs National: ${mtdNationalTotal} ${mtdAreaTotal === mtdNationalTotal ? '✅' : '❌'}`);

        const mtdRegionalTotal = Object.values(mtdData.regions).reduce((sum, region) => sum + region.actual, 0);
        console.log(`MTD Regional Total: ${mtdRegionalTotal} vs National: ${mtdNationalTotal} ${mtdRegionalTotal === mtdNationalTotal ? '✅' : '❌'}`);
        
        console.log('✅ MTD Data verification complete');
    } catch (error) {
        console.error('❌ Error during MTD verification:', error);
        console.log('MTD Data:', mtdData);
    }
}// MTD Data Verification - MOVED TO ASYNC FUNCTION
async function verifyMTDData() {
    if (!mtdData) {
        console.warn('âš ï¸ MTD data not loaded yet');
        return;
    }
    
    const mtdProductTotal = mtdData.national['ANDROID - NATIONAL'].actual + 
                           mtdData.national['SAKU INSURANCE - NATIONAL'].actual + 
                           mtdData.national['SAKU NON INSURANCE - NATIONAL'].actual;
    const mtdNationalTotal = mtdData.national['ALL PRODUCT - NATIONAL'].actual;
    console.log(`MTD Product Total: ${mtdProductTotal} vs National: ${mtdNationalTotal} ${mtdProductTotal === mtdNationalTotal ? 'âœ…' : 'âŒ'}`);

    const mtdAreaTotal = Object.values(mtdData.areas).reduce((sum, area) => sum + area.actual, 0);
    console.log(`MTD Area Total: ${mtdAreaTotal} vs National: ${mtdNationalTotal} ${mtdAreaTotal === mtdNationalTotal ? 'âœ…' : 'âŒ'}`);

    const mtdRegionalTotal = Object.values(mtdData.regions).reduce((sum, region) => sum + region.actual, 0);
    console.log(`MTD Regional Total: ${mtdRegionalTotal} vs National: ${mtdNationalTotal} ${mtdRegionalTotal === mtdNationalTotal ? 'âœ…' : 'âŒ'}`);
}

// MTD Data Verification - MOVED TO ASYNC FUNCTION
async function verifyMTDData() {
    console.log('🔍 Verifying MTD Data...');
    
    if (!mtdData) {
        console.warn('⚠️ MTD data not loaded yet');
        return;
    }
    
    console.log('📊 MTD Data structure:', {
        hasNational: !!mtdData.national,
        hasRegions: !!mtdData.regions,
        hasAreas: !!mtdData.areas,
        hasAndroidAreas: !!mtdData.android_areas
    });
    
    // Check if required data exists
    if (!mtdData.national || !mtdData.national['ALL PRODUCT - NATIONAL']) {
        console.error('❌ National data is missing or incomplete');
        console.log('Available keys:', Object.keys(mtdData.national || {}));
        return;
    }
    
    try {
        const mtdProductTotal = mtdData.national['ANDROID - NATIONAL'].actual + 
                               mtdData.national['SAKU INSURANCE - NATIONAL'].actual + 
                               mtdData.national['SAKU NON INSURANCE - NATIONAL'].actual;
        const mtdNationalTotal = mtdData.national['ALL PRODUCT - NATIONAL'].actual;
        console.log(`MTD Product Total: ${mtdProductTotal} vs National: ${mtdNationalTotal} ${mtdProductTotal === mtdNationalTotal ? '✅' : '❌'}`);

        const mtdAreaTotal = Object.values(mtdData.areas).reduce((sum, area) => sum + area.actual, 0);
        console.log(`MTD Area Total: ${mtdAreaTotal} vs National: ${mtdNationalTotal} ${mtdAreaTotal === mtdNationalTotal ? '✅' : '❌'}`);

        const mtdRegionalTotal = Object.values(mtdData.regions).reduce((sum, region) => sum + region.actual, 0);
        console.log(`MTD Regional Total: ${mtdRegionalTotal} vs National: ${mtdNationalTotal} ${mtdRegionalTotal === mtdNationalTotal ? '✅' : '❌'}`);
        
        console.log('✅ MTD Data verification complete');
    } catch (error) {
        console.error('❌ Error during MTD verification:', error);
        console.log('MTD Data:', mtdData);
    }
}// MTD Data Verification - MOVED TO ASYNC FUNCTION
async function verifyMTDData() {
    if (!mtdData) {
        console.warn('âš ï¸ MTD data not loaded yet');
        return;
    }
    
    const mtdProductTotal = mtdData.national['ANDROID - NATIONAL'].actual + 
                           mtdData.national['SAKU INSURANCE - NATIONAL'].actual + 
                           mtdData.national['SAKU NON INSURANCE - NATIONAL'].actual;
    const mtdNationalTotal = mtdData.national['ALL PRODUCT - NATIONAL'].actual;
    console.log(`MTD Product Total: ${mtdProductTotal} vs National: ${mtdNationalTotal} ${mtdProductTotal === mtdNationalTotal ? 'âœ…' : 'âŒ'}`);

    const mtdAreaTotal = Object.values(mtdData.areas).reduce((sum, area) => sum + area.actual, 0);
    console.log(`MTD Area Total: ${mtdAreaTotal} vs National: ${mtdNationalTotal} ${mtdAreaTotal === mtdNationalTotal ? 'âœ…' : 'âŒ'}`);

    const mtdRegionalTotal = Object.values(mtdData.regions).reduce((sum, region) => sum + region.actual, 0);
    console.log(`MTD Regional Total: ${mtdRegionalTotal} vs National: ${mtdNationalTotal} ${mtdRegionalTotal === mtdNationalTotal ? 'âœ…' : 'âŒ'}`);
}

function getGrowthStatus(growth) {
    if (growth >= 20) return { color: '#10b981', arrow: '↗' };
    if (growth >= 5) return { color: '#10b981', arrow: '↗' };
    if (growth >= -4) return { color: '#64748b', arrow: '→' };
    return { color: '#ef4444', arrow: '↘' };
}

function getAchievementCSSClass(achievement) {
    if (achievement > 100) return 'achievement-positive';
    if (achievement >= 95) return 'achievement-neutral';
    return 'achievement-negative';
}

function getGrowthCSSClass(growth) {
    if (Math.abs(growth) < 5) return 'growth-neutral';
    return growth >= 0 ? 'growth-positive' : 'growth-negative';
}

// PROFESSIONAL NAVIGATION SYSTEM
function initializeProfessionalNavigation() {
    console.log('🚀 Initializing professional navigation system...');

    try {
        // Tab navigation functionality
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all tabs
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Smooth scroll to section
                const targetId = this.getAttribute('href');
                const target = document.querySelector(targetId);
                if (target) {
                    console.log(`🎯 Navigating to: ${targetId}`);
                    target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                    });

                    // Add highlight effect
                    target.style.transition = 'all 0.6s ease';
                    setTimeout(() => {
                        target.style.transition = '';
                    }, 3000);
                }
            });
        });

        // Update active tab based on scroll position
        const sections = [
            { id: 'executive-summary', tab: 'executive-summary' },
            { id: 'regional-analysis', tab: 'regional-analysis' },
            { id: 'product-analysis', tab: 'product-analysis' },
            { id: 'area-analysis', tab: 'area-analysis' },
            { id: 'mse-analysis-section', tab: 'mse-analysis-section' }
        ];

        // Throttled scroll handler for performance
        let ticking = false;
        function updateActiveTab() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollPosition = window.scrollY + 100;
                    let activeSection = sections[0];

                    sections.forEach(section => {
                        const element = document.getElementById(section.id);
                        if (element && element.offsetTop <= scrollPosition) {
                            activeSection = section;
                        }
                    });

                    // Update active tab
                    document.querySelectorAll('.nav-tab').forEach(tab => {
                        tab.classList.remove('active');
                        if (tab.getAttribute('href') === `#${activeSection.tab}`) {
                            tab.classList.add('active');
                        }
                    });

                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', updateActiveTab);
        
        console.log('✅ Professional navigation initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing professional navigation:', error);
    }
}

async function createProfessionalMTDTable() {
    console.log('🚀 Creating Professional MTD Performance Table with Dynamic Data...');

    try {
        // Build MTD data from raw files if not already loaded
        if (!mtdData) {
            mtdData = await buildMTDDataFromRaw();
        }
        
        if (!mtdData) {
            console.error('❌ MTD data is null - cannot create table');
            return;
        }
        
        const tbody = document.getElementById('mtdTableBody');
        if (!tbody) {
            console.warn('MTD table body not found');
            return;
        }

        tbody.innerHTML = '';

        // Enhanced metrics: NATIONAL (4) + REGIONAL (3) + AREAS (10) + ANDROID AREAS (10) = 27 total metrics
        const allMetrics = [
            // NATIONAL items first (4 items)
            {
                name: 'ALL PRODUCT - NATIONAL',
                target: mtdData.national['ALL PRODUCT - NATIONAL'].target.toLocaleString(),
                actual: mtdData.national['ALL PRODUCT - NATIONAL'].actual.toLocaleString(),
                achievement: mtdData.national['ALL PRODUCT - NATIONAL'].achievement,
                growth: mtdData.national['ALL PRODUCT - NATIONAL'].growth,
                type: 'national'
            },
            {
                name: 'ANDROID - NATIONAL',
                target: mtdData.national['ANDROID - NATIONAL'].target.toLocaleString(),
                actual: mtdData.national['ANDROID - NATIONAL'].actual.toLocaleString(),
                achievement: mtdData.national['ANDROID - NATIONAL'].achievement,
                growth: mtdData.national['ANDROID - NATIONAL'].growth,
                type: 'national'
            },
            {
                name: 'SAKU INSURANCE - NATIONAL',
                target: mtdData.national['SAKU INSURANCE - NATIONAL'].target.toLocaleString(),
                actual: mtdData.national['SAKU INSURANCE - NATIONAL'].actual.toLocaleString(),
                achievement: mtdData.national['SAKU INSURANCE - NATIONAL'].achievement,
                growth: mtdData.national['SAKU INSURANCE - NATIONAL'].growth,
                type: 'national'
            },
            {
                name: 'SAKU NON INSURANCE - NATIONAL',
                target: mtdData.national['SAKU NON INSURANCE - NATIONAL'].target.toLocaleString(),
                actual: mtdData.national['SAKU NON INSURANCE - NATIONAL'].actual.toLocaleString(),
                achievement: mtdData.national['SAKU NON INSURANCE - NATIONAL'].achievement,
                growth: mtdData.national['SAKU NON INSURANCE - NATIONAL'].growth,
                type: 'national'
            },
            // REGIONAL items (3 items)
            {
                name: 'EAST REGION',
                target: mtdData.regions['EAST REGION'].target.toLocaleString(),
                actual: mtdData.regions['EAST REGION'].actual.toLocaleString(),
                achievement: mtdData.regions['EAST REGION'].achievement,
                growth: mtdData.regions['EAST REGION'].growth,
                type: 'regional'
            },
            {
                name: 'JAVA REGION',
                target: mtdData.regions['JAVA REGION'].target.toLocaleString(),
                actual: mtdData.regions['JAVA REGION'].actual.toLocaleString(),
                achievement: mtdData.regions['JAVA REGION'].achievement,
                growth: mtdData.regions['JAVA REGION'].growth,
                type: 'regional'
            },
            {
                name: 'SUMATERA REGION',
                target: mtdData.regions['SUMATERA REGION'].target.toLocaleString(),
                actual: mtdData.regions['SUMATERA REGION'].actual.toLocaleString(),
                achievement: mtdData.regions['SUMATERA REGION'].achievement,
                growth: mtdData.regions['SUMATERA REGION'].growth,
                type: 'regional'
            },
            // All 10 areas
            {
                name: 'BALI NUSRA',
                target: mtdData.areas['BALI NUSRA'].target.toLocaleString(),
                actual: mtdData.areas['BALI NUSRA'].actual.toLocaleString(),
                achievement: mtdData.areas['BALI NUSRA'].achievement,
                growth: mtdData.areas['BALI NUSRA'].growth,
                type: 'area'
            },
            {
                name: 'JAKARTA',
                target: mtdData.areas['JAKARTA'].target.toLocaleString(),
                actual: mtdData.areas['JAKARTA'].actual.toLocaleString(),
                achievement: mtdData.areas['JAKARTA'].achievement,
                growth: mtdData.areas['JAKARTA'].growth,
                type: 'area'
            },
            {
                name: 'JAVA 1',
                target: mtdData.areas['JAVA 1'].target.toLocaleString(),
                actual: mtdData.areas['JAVA 1'].actual.toLocaleString(),
                achievement: mtdData.areas['JAVA 1'].achievement,
                growth: mtdData.areas['JAVA 1'].growth,
                type: 'area'
            },
            {
                name: 'JAVA 2',
                target: mtdData.areas['JAVA 2'].target.toLocaleString(),
                actual: mtdData.areas['JAVA 2'].actual.toLocaleString(),
                achievement: mtdData.areas['JAVA 2'].achievement,
                growth: mtdData.areas['JAVA 2'].growth,
                type: 'area'
            },
            {
                name: 'JAVA 3',
                target: mtdData.areas['JAVA 3'].target.toLocaleString(),
                actual: mtdData.areas['JAVA 3'].actual.toLocaleString(),
                achievement: mtdData.areas['JAVA 3'].achievement,
                growth: mtdData.areas['JAVA 3'].growth,
                type: 'area'
            },
            {
                name: 'KALIMANTAN',
                target: mtdData.areas['KALIMANTAN'].target.toLocaleString(),
                actual: mtdData.areas['KALIMANTAN'].actual.toLocaleString(),
                achievement: mtdData.areas['KALIMANTAN'].achievement,
                growth: mtdData.areas['KALIMANTAN'].growth,
                type: 'area'
            },
            {
                name: 'SULAWESI',
                target: mtdData.areas['SULAWESI'].target.toLocaleString(),
                actual: mtdData.areas['SULAWESI'].actual.toLocaleString(),
                achievement: mtdData.areas['SULAWESI'].achievement,
                growth: mtdData.areas['SULAWESI'].growth,
                type: 'area'
            },
            {
                name: 'SUMATERA 1',
                target: mtdData.areas['SUMATERA 1'].target.toLocaleString(),
                actual: mtdData.areas['SUMATERA 1'].actual.toLocaleString(),
                achievement: mtdData.areas['SUMATERA 1'].achievement,
                growth: mtdData.areas['SUMATERA 1'].growth,
                type: 'area'
            },
            {
                name: 'SUMATERA 2',
                target: mtdData.areas['SUMATERA 2'].target.toLocaleString(),
                actual: mtdData.areas['SUMATERA 2'].actual.toLocaleString(),
                achievement: mtdData.areas['SUMATERA 2'].achievement,
                growth: mtdData.areas['SUMATERA 2'].growth,
                type: 'area'
            },
            {
                name: 'SUMATERA 3',
                target: mtdData.areas['SUMATERA 3'].target.toLocaleString(),
                actual: mtdData.areas['SUMATERA 3'].actual.toLocaleString(),
                achievement: mtdData.areas['SUMATERA 3'].achievement,
                growth: mtdData.areas['SUMATERA 3'].growth,
                type: 'area'
            },
            // Android area metrics (10 items)
            {
                name: 'ANDROID - BALI NUSRA',
                target: mtdData.android_areas['BALI NUSRA ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['BALI NUSRA ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['BALI NUSRA ANDROID'].achievement,
                growth: mtdData.android_areas['BALI NUSRA ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - JAKARTA',
                target: mtdData.android_areas['JAKARTA ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['JAKARTA ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['JAKARTA ANDROID'].achievement,
                growth: mtdData.android_areas['JAKARTA ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - JAVA 1',
                target: mtdData.android_areas['JAVA 1 ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['JAVA 1 ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['JAVA 1 ANDROID'].achievement,
                growth: mtdData.android_areas['JAVA 1 ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - JAVA 2',
                target: mtdData.android_areas['JAVA 2 ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['JAVA 2 ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['JAVA 2 ANDROID'].achievement,
                growth: mtdData.android_areas['JAVA 2 ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - JAVA 3',
                target: mtdData.android_areas['JAVA 3 ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['JAVA 3 ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['JAVA 3 ANDROID'].achievement,
                growth: mtdData.android_areas['JAVA 3 ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - KALIMANTAN',
                target: mtdData.android_areas['KALIMANTAN ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['KALIMANTAN ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['KALIMANTAN ANDROID'].achievement,
                growth: mtdData.android_areas['KALIMANTAN ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - SULAWESI',
                target: mtdData.android_areas['SULAWESI ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['SULAWESI ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['SULAWESI ANDROID'].achievement,
                growth: mtdData.android_areas['SULAWESI ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - SUMATERA 1',
                target: mtdData.android_areas['SUMATERA 1 ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['SUMATERA 1 ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['SUMATERA 1 ANDROID'].achievement,
                growth: mtdData.android_areas['SUMATERA 1 ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - SUMATERA 2',
                target: mtdData.android_areas['SUMATERA 2 ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['SUMATERA 2 ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['SUMATERA 2 ANDROID'].achievement,
                growth: mtdData.android_areas['SUMATERA 2 ANDROID'].growth,
                type: 'android_area'
            },
            {
                name: 'ANDROID - SUMATERA 3',
                target: mtdData.android_areas['SUMATERA 3 ANDROID'].target.toLocaleString(),
                actual: mtdData.android_areas['SUMATERA 3 ANDROID'].actual.toLocaleString(),
                achievement: mtdData.android_areas['SUMATERA 3 ANDROID'].achievement,
                growth: mtdData.android_areas['SUMATERA 3 ANDROID'].growth,
                type: 'android_area'
            }
        ];

        allMetrics.forEach((metric, index) => {
            // Add section headers
            if (index === 4) {
                const sectionRow = tbody.insertRow();
                sectionRow.className = 'section-header-row';
                const sectionCell = sectionRow.insertCell(0);
                sectionCell.colSpan = 5;
                sectionCell.innerHTML = '<div class="section-header">Regional Level Performance</div>';
                sectionCell.className = 'section-header-cell';
            }
            if (index === 7) {
                const sectionRow = tbody.insertRow();
                sectionRow.className = 'section-header-row';
                const sectionCell = sectionRow.insertCell(0);
                sectionCell.colSpan = 5;
                sectionCell.innerHTML = '<div class="section-header">Area Level Performance</div>';
                sectionCell.className = 'section-header-cell';
            }
            if (index === 17) {
                const sectionRow = tbody.insertRow();
                sectionRow.className = 'section-header-row';
                const sectionCell = sectionRow.insertCell(0);
                sectionCell.colSpan = 5;
                sectionCell.innerHTML = '<div class="section-header">Android Area Level Performance</div>';
                sectionCell.className = 'section-header-cell';
            }

            const row = tbody.insertRow();

            const isNational = metric.type === 'national';
            const isRegional = metric.type === 'regional';
            const isAndroidArea = metric.type === 'android_area';

            // Metric Name
            const nameCell = row.insertCell(0);
            nameCell.textContent = metric.name;
            nameCell.className = isNational ? 'metric-name national-metric' :
                isRegional ? 'metric-name regional-metric' : 
                isAndroidArea ? 'metric-name android-area-metric' : 'metric-name area-metric';

            // Target
            const targetCell = row.insertCell(1);
            targetCell.textContent = metric.target;

            // Actual
            const actualCell = row.insertCell(2);
            actualCell.textContent = metric.actual;

            // Achievement vs Target
            const achievementCell = row.insertCell(3);
            achievementCell.innerHTML = `${metric.achievement.toFixed(2)}%`;
            achievementCell.className = `achievement-cell ${getAchievementCSSClass(metric.achievement)}`;

            // Growth vs Last Month
            const growthCell = row.insertCell(4);
            const growthStatus = getGrowthStatus(metric.growth);
            const growthSign = metric.growth >= 0 ? '+' : '';
            growthCell.innerHTML = `${growthStatus.arrow} ${growthSign}${metric.growth.toFixed(2)}%`;
            growthCell.className = `growth-cell ${getGrowthCSSClass(metric.growth)}`;
        });

        console.log('✅ Professional MTD Performance Table created successfully with dynamic data');
        
    } catch (error) {
        console.error('❌ Error creating Professional MTD Performance Table:', error);
        console.error('Error details:', error.stack);
    }
}

// Continue with remaining functions (XmR calculations, chart creation, etc.)
// XmR Metrics Calculation with Lebaran Exclusion
function calculateXmRMetrics(originalData, filteredData = null, useFiltered = true) {
    // Use filtered data for calculations if available and requested
    const data = (useFiltered && filteredData) ? filteredData : originalData;
    const n = data.length;

    if (n === 0) {
        return {
            centerLineX: 0, centerLineMR: 0, upperNaturalProcessLimit: 0,
            lowerNaturalProcessLimit: 0, upperRangeLimit: 0,
            upperQuarterLine: 0, lowerQuarterLine: 0, movingRanges: [], isFiltered: useFiltered
        };
    }

    const movingRanges = [];
    for (let i = 1; i < n; i++) {
        movingRanges.push(Math.abs(data[i] - data[i - 1]));
    }

    const centerLineX = data.reduce((sum, value) => sum + value, 0) / n;
    const centerLineMR = movingRanges.length > 0 ? movingRanges.reduce((sum, value) => sum + value, 0) / movingRanges.length : 0;

    // Control Limits using 2.66 multiplier (calculated from filtered data)
    const upperNaturalProcessLimit = centerLineX + (2.66 * centerLineMR);
    const lowerNaturalProcessLimit = centerLineX - (2.66 * centerLineMR);
    const upperRangeLimit = centerLineMR > 0 ? 3.27 * centerLineMR : 0;

    // Quarter Lines for Rule 2 detection
    const upperQuarterLine = (upperNaturalProcessLimit + centerLineX) / 2;
    const lowerQuarterLine = (lowerNaturalProcessLimit + centerLineX) / 2;

    return {
        centerLineX, centerLineMR, upperNaturalProcessLimit, lowerNaturalProcessLimit,
        upperRangeLimit, upperQuarterLine, lowerQuarterLine, movingRanges, isFiltered: useFiltered
    };
}

// STRICT RULE 1 & RULE 2 ANOMALY DETECTION with Professional Reporting
function detectAnomalies(originalData, metrics, exclusionIndices = lebaranExclusionIndices, variableName = "Unknown") {
    console.log(`🔍 [${variableName}] Starting professional anomaly detection...`);

    const anomalies = [];
    const pointColors = new Array(originalData.length).fill('#374151');
    const mrPointColors = new Array(metrics.movingRanges.length).fill('#374151');
    const rule1ViolationIndices = [];

    // Mark holiday weeks with special color (grey)
    exclusionIndices.forEach(index => {
        if (index < pointColors.length) {
            pointColors[index] = '#9ca3af'; // Professional grey for holiday weeks
        }
    });

    // Rule 1: Points outside control limits - EXCLUDE holiday weeks from analysis
    for (let i = 0; i < originalData.length; i++) {
        // Skip analysis for holiday weeks but keep them marked as grey
        if (exclusionIndices.includes(i)) {
            anomalies.push({
                type: "holiday_exclusion",
                point: i + 1,
                week: labels[i],
                value: originalData[i],
                description: `Data point at ${labels[i]} (Lebaran holiday period)`
            });
            continue;
        }

        let anomalyType = null;
        let anomalyColor = '#374151';

        if (originalData[i] > metrics.upperNaturalProcessLimit) {
            anomalyType = "increase";
            anomalyColor = '#10b981'; // Professional green for increase
            rule1ViolationIndices.push(i);
        } else if (originalData[i] < metrics.lowerNaturalProcessLimit) {
            anomalyType = "decrease";
            anomalyColor = '#ef4444'; // Professional red for decrease
            rule1ViolationIndices.push(i);
        }

        if (anomalyType) {
            pointColors[i] = anomalyColor;
            anomalies.push({
                type: anomalyType,
                point: i + 1,
                week: labels[i],
                value: originalData[i],
                description: `Rule 1 Anomaly (${anomalyType}) - Point outside control limits: ${originalData[i]} at ${labels[i]}`
            });
        }
    }

    // Moving Range anomalies - calculate from filtered data
    const filteredMovingRanges = metrics.movingRanges;
    for (let i = 0; i < filteredMovingRanges.length; i++) {
        if (filteredMovingRanges[i] > metrics.upperRangeLimit) {
            mrPointColors[i] = '#ef4444'; // Professional red for high variability
            const correspondingWeekIndex = i + 1;
            anomalies.push({
                type: "variability_increase",
                point: correspondingWeekIndex + 1,
                week: labels[correspondingWeekIndex] || 'N/A',
                value: filteredMovingRanges[i],
                description: `Variability Concern - Moving range outside limit: ${filteredMovingRanges[i].toFixed(0)} at ${labels[correspondingWeekIndex] || 'N/A'}`
            });
        }
    }

    // Rule 2: Three out of four consecutive points near limits - EXCLUDE holiday weeks
    for (let i = 0; i <= originalData.length - 4; i++) {
        let hasRule1InGroup = false;

        // Check for Rule 1 violations or holidays in the 4-point group
        for (let j = i; j < i + 4; j++) {
            if (rule1ViolationIndices.includes(j) || exclusionIndices.includes(j)) {
                hasRule1InGroup = true;
                break;
            }
        }

        if (!hasRule1InGroup) {
            let nearLimitsCount = 0, upperSideCount = 0, lowerSideCount = 0;
            for (let j = i; j < i + 4; j++) {
                // Skip holiday weeks in Rule 2 analysis
                if (exclusionIndices.includes(j)) continue;

                if (originalData[j] > metrics.upperQuarterLine) {
                    nearLimitsCount++;
                    upperSideCount++;
                } else if (originalData[j] < metrics.lowerQuarterLine) {
                    nearLimitsCount++;
                    lowerSideCount++;
                }
            }

            if (nearLimitsCount >= 3) {
                let anomalyType = null, anomalyColor = '#374151';
                if (upperSideCount >= lowerSideCount && upperSideCount > 0) {
                    anomalyType = "increase";
                    anomalyColor = '#86efac'; // Light professional green for Rule 2 increase
                } else if (lowerSideCount > upperSideCount && lowerSideCount > 0) {
                    anomalyType = "decrease";
                    anomalyColor = '#fca5a5'; // Light professional red for Rule 2 decrease
                }

                if (anomalyType) {
                    anomalies.push({
                        type: anomalyType,
                        point: `${i + 1}-${i + 4}`,
                        week: `${labels[i]} to ${labels[i + 3]}`,
                        description: `Rule 2 Anomaly (${anomalyType}) - Three out of four consecutive points near limits from ${labels[i]} to ${labels[i + 3]}`
                    });
                    for (let j = i; j < i + 4; j++) {
                        // Don't overwrite holiday colors or existing anomaly colors
                        if (pointColors[j] === '#374151') pointColors[j] = anomalyColor;
                    }
                }
            }
        }
    }

    // DETERMINE FINAL STATUS: Only based on Rule 1 & Rule 2 anomalies (excluding holidays)
    let finalStatus = 'stable'; // Default to stable
    const nonHolidayAnomalies = anomalies.filter(a => a.type !== 'holiday_exclusion');

    if (nonHolidayAnomalies.length > 0) {
        // Check most recent anomalies for final status
        const recentAnomalies = nonHolidayAnomalies.filter(a => a.type === 'increase' || a.type === 'decrease');

        if (recentAnomalies.length > 0) {
            const lastAnomaly = recentAnomalies[recentAnomalies.length - 1];
            finalStatus = lastAnomaly.type;
        }
    }

    return { anomalies, pointColors, mrPointColors, finalStatus };
}

// Continue with rest of the functions...
// Chart Y-Axis Range Calculations
function getChartYAxisRange(data, metrics) {
    const dataValues = data.filter(v => v !== null && v !== undefined);
    if (dataValues.length === 0) return { min: 0, max: 1 };

    let minVal = Math.min(...dataValues, metrics.lowerNaturalProcessLimit);
    let maxVal = Math.max(...dataValues, metrics.upperNaturalProcessLimit);

    const range = maxVal - minVal;
    const padding = range * 0.15;

    return {
        min: Math.max(0, minVal - padding),
        max: maxVal + padding
    };
}

function getMRChartYAxisRange(movingRanges, metrics) {
    const dataValues = movingRanges.filter(v => v !== null && v !== undefined);
    if (dataValues.length === 0) return { min: 0, max: 1 };

    let maxVal = Math.max(...dataValues, metrics.upperRangeLimit);
    const padding = maxVal * 0.15;

    return {
        min: 0,
        max: maxVal + padding
    };
}

// Enhanced data labels plugin for Chart.js with professional styling
const professionalDataLabelsPlugin = {
    id: 'professionalDataLabels',
    afterDatasetsDraw: function(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            // Add labels to the main data series (first dataset) and target data (if present)
            if (datasetIndex === 0 || dataset.label === 'Target') {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.data.forEach((element, index) => {
                    const dataValue = dataset.data[index];

                    // Skip null values (no target data for certain weeks)
                    if (dataValue === null || dataValue === undefined) return;

                    const position = element.tooltipPosition();

                    // Check if this is a holiday week
                    const isHoliday = lebaranExclusionIndices.includes(index);
                    const isTarget = dataset.label === 'Target';

                    // Set professional text style based on data type
                    if (isTarget) {
                        ctx.fillStyle = isHoliday ? '#9ca3af' : '#f59e0b'; // Professional grey for holiday target, amber for normal target
                        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    } else {
                        ctx.fillStyle = isHoliday ? '#9ca3af' : '#374151'; // Professional grey for holidays, slate for normal
                        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    }

                    ctx.textAlign = 'center';
                    ctx.textBaseline = isTarget ? 'top' : 'bottom'; // Target labels below, actual labels above

                    // Format the value
                    let displayValue;
                    if (dataset.label && dataset.label.includes('Moving Range')) {
                        displayValue = dataValue.toFixed(1);
                    } else {
                        displayValue = Math.round(dataValue).toString();
                    }

                    // Add markers for holidays and targets
                    if (isHoliday && isTarget && dataValue === 0) {
                        displayValue = "0"; // Holiday target (no asterisk, grey color shows it's holiday)
                    } else if (isTarget) {
                        displayValue = `T:${displayValue}`; // Target prefix
                    }

                    // Position labels to avoid overlap
                    const yOffset = isTarget ? 8 : -8; // Target labels below points, actual above
                    ctx.fillText(displayValue, position.x, position.y + yOffset);
                });
            }
        });
    }
};

// Register the professional plugin
Chart.register(professionalDataLabelsPlugin);
function createRegionalLineChart(canvasId, regionData, regionName, areaNames, areaColors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas element ${canvasId} not found`);
        return;
    }

    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    // Professional area key mapping
    const areaKeyMapping = {
        'Bali Nusra': 'baliNusra',
        'Kalimantan': 'kalimantan',
        'Sulawesi': 'sulawesi',
        'Jakarta': 'jakarta',
        'Java 1': 'java1',
        'Java 2': 'java2',
        'Java 3': 'java3',
        'Sumatera 1': 'sumatera1',
        'Sumatera 2': 'sumatera2',
        'Sumatera 3': 'sumatera3'
    };

    // Create datasets for each area in the region
    const datasets = [];
    areaNames.forEach((areaName, index) => {
        const areaKey = areaKeyMapping[areaName];
        
        // ✅ FIX: Use individualVariableDataOriginal which is defined globally
        const areaData = individualVariableDataOriginal[areaKey];

        console.log(`🎯 Regional Chart: ${areaName} → ${areaKey} → Data found: ${areaData ? 'YES' : 'NO'}`);

        if (areaData) {
            datasets.push({
                label: areaName.toUpperCase(),
                data: areaData,
                borderColor: areaColors[index],
                backgroundColor: areaColors[index],
                pointBackgroundColor: areaColors[index],
                pointBorderColor: areaColors[index],
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: false,
                tension: 0.1,
                borderWidth: 3
            });
        } else {
            console.error(`❌ No data found for area: ${areaName} (key: ${areaKey})`);
        }
    });

    try {
        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${regionName} - Individual Area Trends`,
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        },
                        color: '#1e293b'
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            font: { 
                                size: 12, 
                                weight: '500',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            padding: 15,
                            color: '#374151'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#374151',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const isHoliday = lebaranExclusionIndices.includes(context.dataIndex);
                                const suffix = isHoliday ? ' (Holiday)' : '';
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(0) + suffix;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Orders',
                            font: { 
                                size: 14, 
                                weight: '600',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        },
                        beginAtZero: true,
                        ticks: {
                            font: { 
                                size: 11,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Week',
                            font: { 
                                size: 14, 
                                weight: '600',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        },
                        ticks: {
                            maxRotation: 45,
                            font: { 
                                size: 10,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });

        canvas.chartInstance = chart;
        console.log(`✅ Created professional regional line chart: ${canvasId}`);

    } catch (error) {
        console.error(`❌ Error creating regional line chart ${canvasId}:`, error);
    }
}

// PROFESSIONAL XmR CHART CREATION with Clean Design
function createProfessionalChart(canvasId, originalData, filteredData, metrics, pointColors, title, alertsId, targetData = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas element ${canvasId} not found`);
        return;
    }

    // Clear any existing chart
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    const yAxisRange = getChartYAxisRange(originalData, metrics);

    // If target data exists, include it in Y-axis range calculation
    if (targetData) {
        const targetValues = targetData.filter(v => v !== null && v !== 0);
        if (targetValues.length > 0) {
            const targetMin = Math.min(...targetValues);
            const targetMax = Math.max(...targetValues);
            yAxisRange.min = Math.min(yAxisRange.min, targetMin - (targetMax - targetMin) * 0.1);
            yAxisRange.max = Math.max(yAxisRange.max, targetMax + (targetMax - targetMin) * 0.1);
        }
    }

    // Professional datasets with clean styling
    const datasets = [
        {
            label: title,
            data: originalData,
            borderColor: '#374151',
            backgroundColor: '#374151',
            pointBackgroundColor: pointColors,
            pointBorderColor: '#374151',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            tension: 0,
            order: 1
        },
        {
            label: 'Upper Natural Process Limit',
            data: new Array(originalData.length).fill(metrics.upperNaturalProcessLimit),
            borderColor: '#3b82f6',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBorderWidth: 0,
            fill: false,
            order: 3
        },
        {
            label: 'Center Line',
            data: new Array(originalData.length).fill(metrics.centerLineX),
            borderColor: '#ef4444',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBorderWidth: 0,
            fill: false,
            order: 3
        },
        {
            label: 'Lower Natural Process Limit',
            data: new Array(originalData.length).fill(metrics.lowerNaturalProcessLimit),
            borderColor: '#3b82f6',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBorderWidth: 0,
            fill: false,
            order: 3
        },
        {
            label: 'Upper Quarter Line',
            data: new Array(originalData.length).fill(metrics.upperQuarterLine),
            borderColor: '#94a3b8',
            borderDash: [2, 2],
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBorderWidth: 0,
            fill: false,
            order: 4
        },
        {
            label: 'Lower Quarter Line',
            data: new Array(originalData.length).fill(metrics.lowerQuarterLine),
            borderColor: '#94a3b8',
            borderDash: [2, 2],
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBorderWidth: 0,
            fill: false,
            order: 4
        }
    ];

    // Add professional target line if target data is provided
    if (targetData) {
        datasets.push({
            label: 'Target',
            data: targetData,
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            borderDash: [8, 4],
            borderWidth: 3,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#f59e0b',
            pointBorderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.1,
            order: 2
        });
    }

    try {
        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: targetData ? true : false,
                        position: 'bottom',
                        labels: {
                            filter: function(legendItem, chartData) {
                                return legendItem.text === 'Target' || legendItem.text === title;
                            },
                            usePointStyle: true,
                            font: { 
                                size: 11,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#374151',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const isHoliday = lebaranExclusionIndices.includes(context.dataIndex);
                                const suffix = isHoliday ? ' (Holiday)' : '';

                                if (context.dataset.label === 'Target') {
                                    const value = context.parsed.y;
                                    return value === 0 ? 'Target: No target (Holiday)' : `Target: ${value}`;
                                }

                                return context.dataset.label + ': ' + context.parsed.y.toFixed(0) + suffix;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: { 
                            display: true, 
                            text: title,
                            font: {
                                size: 12,
                                weight: '600',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        },
                        min: yAxisRange.min,
                        max: yAxisRange.max,
                        ticks: {
                            font: { 
                                size: 10,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        title: { 
                            display: true, 
                            text: 'Week',
                            font: {
                                size: 12,
                                weight: '600',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        },
                        ticks: {
                            maxRotation: 45,
                            font: { 
                                size: 10,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            },
            plugins: [professionalDataLabelsPlugin]
        });

        // Store chart reference for cleanup
        canvas.chartInstance = chart;
        console.log(`✅ Created professional XmR chart: ${canvasId}`);

    } catch (error) {
        console.error(`❌ Error creating chart ${canvasId}:`, error);
    }

    // Generate professional alerts
    if (alertsId) {
        const analysis = detectAnomalies(originalData, metrics, lebaranExclusionIndices, title);
        createProfessionalAlerts(analysis.anomalies, alertsId);
    }
}

// PROFESSIONAL mR CHART CREATION
function createProfessionalMRChart(canvasId, movingRanges, metrics) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas element ${canvasId} not found`);
        return;
    }

    // Clear any existing chart
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    const mrYAxisRange = getMRChartYAxisRange(movingRanges, metrics);

    try {
        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels.slice(1),
                datasets: [
                    {
                        label: 'Moving Range',
                        data: movingRanges,
                        borderColor: '#374151',
                        backgroundColor: '#374151',
                        pointBackgroundColor: '#374151',
                        pointBorderColor: '#374151',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: false,
                        tension: 0
                    },
                    {
                        label: 'Upper Range Limit',
                        data: new Array(movingRanges.length).fill(metrics.upperRangeLimit),
                        borderColor: '#3b82f6',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointBorderWidth: 0,
                        fill: false
                    },
                    {
                        label: 'Center Line mR',
                        data: new Array(movingRanges.length).fill(metrics.centerLineMR),
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointBorderWidth: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#374151',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: { 
                            display: true, 
                            text: 'Moving Range',
                            font: {
                                size: 12,
                                weight: '600',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        },
                        min: mrYAxisRange.min,
                        max: mrYAxisRange.max,
                        ticks: {
                            font: { 
                                size: 10,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        title: { 
                            display: true, 
                            text: 'Week',
                            font: {
                                size: 12,
                                weight: '600',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#374151'
                        },
                        ticks: {
                            maxRotation: 45,
                            font: { 
                                size: 10,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            },
            plugins: [professionalDataLabelsPlugin]
        });

        // Store chart reference for cleanup
        canvas.chartInstance = chart;
        console.log(`✅ Created professional mR chart: ${canvasId}`);

    } catch (error) {
        console.error(`❌ Error creating mR chart ${canvasId}:`, error);
    }
}

// PROFESSIONAL ALERT STYLING
function createProfessionalAlerts(anomalies, alertsId) {
    const alertsDiv = document.getElementById(alertsId);
    if (!alertsDiv) return;

    if (anomalies.length === 0) {
        alertsDiv.innerHTML = `
            <div class="alert alert-stable">
                <strong>Process Status:</strong> Statistical process in control with normal variation patterns.
            </div>
        `;
    } else {
        let alertsHtml = '';
        const priorityAnomalies = anomalies.filter(a => a.type !== 'holiday_exclusion');
        const holidayAnomalies = anomalies.filter(a => a.type === 'holiday_exclusion');

        priorityAnomalies.forEach(anomaly => {
            let alertClass = 'alert-stable';
            let alertTitle = 'Process Note';
            
            if (anomaly.type === 'increase') {
                alertClass = 'alert-positive';
                alertTitle = 'Performance Increase';
            } else if (anomaly.type === 'decrease') {
                alertClass = 'alert-negative';
                alertTitle = 'Performance Concern';
            } else if (anomaly.type === 'variability_increase') {
                alertClass = 'alert-negative';
                alertTitle = 'Variability Alert';
            }

            alertsHtml += `
                <div class="alert ${alertClass}">
                    <strong>${alertTitle}:</strong> ${anomaly.description}
                </div>
            `;
        });

        holidayAnomalies.forEach(anomaly => {
            alertsHtml += `
                <div class="alert alert-holiday">
                    <strong>Data Note:</strong> ${anomaly.description}
                </div>
            `;
        });

        alertsDiv.innerHTML = alertsHtml;
    }
}

// Create All Regional Charts (Line Charts + XmR Charts)
function createAllRegionalCharts() {
    console.log('🚀 Creating Regional Charts with Professional Design...');

    try {
        // EAST REGION
        console.log('🏝️ Creating East Region charts...');

        // East Region Line Chart
        createRegionalLineChart(
            'eastRegionLineChart',
            regionalData.eastRegion,
            'East Region',
            ['Bali Nusra', 'Kalimantan', 'Sulawesi'],
            ['#3b82f6', '#ef4444', '#f59e0b']
        );

        // East Region XmR Analysis
        const eastMetrics = calculateXmRMetrics(regionalData.eastRegion, regionalDataFiltered.eastRegion, true);
        const eastAnalysis = detectAnomalies(regionalData.eastRegion, eastMetrics, lebaranExclusionIndices, "East Region");

        // Update metrics display
        const eastMetricsDiv = document.getElementById('eastRegionMetrics');
        if (eastMetricsDiv) {
            eastMetricsDiv.innerHTML = `
                <span>Center: ${eastMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${eastMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${eastMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${eastMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }

        createProfessionalChart('eastRegionChart', regionalData.eastRegion, regionalDataFiltered.eastRegion, eastMetrics, eastAnalysis.pointColors, 'East Region Total Orders', 'eastRegionAlerts', regionalTargetData.eastRegion);
        createProfessionalMRChart('eastRegionMRChart', eastMetrics.movingRanges, eastMetrics);

        // JAVA REGION
        console.log('☕ Creating Java Region charts...');

        // Java Region Line Chart
        createRegionalLineChart(
            'javaRegionLineChart',
            regionalData.javaRegion,
            'Java Region',
            ['Jakarta', 'Java 1', 'Java 2', 'Java 3'],
            ['#3b82f6', '#ef4444', '#f59e0b', '#10b981']
        );

        // Java Region XmR Analysis
        const javaMetrics = calculateXmRMetrics(regionalData.javaRegion, regionalDataFiltered.javaRegion, true);
        const javaAnalysis = detectAnomalies(regionalData.javaRegion, javaMetrics, lebaranExclusionIndices, "Java Region");

        // Update metrics display
        const javaMetricsDiv = document.getElementById('javaRegionMetrics');
        if (javaMetricsDiv) {
            javaMetricsDiv.innerHTML = `
                <span>Center: ${javaMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${javaMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${javaMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${javaMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }

        createProfessionalChart('javaRegionChart', regionalData.javaRegion, regionalDataFiltered.javaRegion, javaMetrics, javaAnalysis.pointColors, 'Java Region Total Orders', 'javaRegionAlerts', regionalTargetData.javaRegion);
        createProfessionalMRChart('javaRegionMRChart', javaMetrics.movingRanges, javaMetrics);

        // SUMATERA REGION
        console.log('⛰️ Creating Sumatera Region charts...');

        // Sumatera Region Line Chart
        createRegionalLineChart(
            'sumateraRegionLineChart',
            regionalData.sumateraRegion,
            'Sumatera Region',
            ['Sumatera 1', 'Sumatera 2', 'Sumatera 3'],
            ['#3b82f6', '#ef4444', '#f59e0b']
        );

        // Sumatera Region XmR Analysis
        const sumateraMetrics = calculateXmRMetrics(regionalData.sumateraRegion, regionalDataFiltered.sumateraRegion, true);
        const sumateraAnalysis = detectAnomalies(regionalData.sumateraRegion, sumateraMetrics, lebaranExclusionIndices, "Sumatera Region");

        // Update metrics display
        const sumateraMetricsDiv = document.getElementById('sumateraRegionMetrics');
        if (sumateraMetricsDiv) {
            sumateraMetricsDiv.innerHTML = `
                <span>Center: ${sumateraMetrics.centerLineX.toFixed(1)}</span>
                <span>Range: ${sumateraMetrics.centerLineMR.toFixed(1)}</span>
                <span>Upper: ${sumateraMetrics.upperNaturalProcessLimit.toFixed(1)}</span>
                <span>Lower: ${sumateraMetrics.lowerNaturalProcessLimit.toFixed(1)}</span>
            `;
        }

        createProfessionalChart('sumateraRegionChart', regionalData.sumateraRegion, regionalDataFiltered.sumateraRegion, sumateraMetrics, sumateraAnalysis.pointColors, 'Sumatera Region Total Orders', 'sumateraRegionAlerts', regionalTargetData.sumateraRegion);
        createProfessionalMRChart('sumateraRegionMRChart', sumateraMetrics.movingRanges, sumateraMetrics);

        console.log('✅ All regional charts created with professional design');
    } catch (error) {
        console.error('❌ Error creating regional charts:', error);
    }
}

// Create all individual variable charts with professional design
function createAllIndividualVariableCharts() {
    console.log('🚀 Creating all individual variable charts with professional design...');

    try {
        // PRODUCT TYPE ANALYSIS
        // Android Orders
        const androidMetrics = calculateXmRMetrics(individualVariableData.android, individualVariableDataFiltered.android, true);
        const androidAnalysis = detectAnomalies(individualVariableData.android, androidMetrics, lebaranExclusionIndices, "Android Orders");
        createProfessionalChart('androidChart', individualVariableData.android, individualVariableDataFiltered.android, androidMetrics, androidAnalysis.pointColors, 'Android Orders', 'androidAlerts', targetData.android);
        createProfessionalMRChart('androidMRChart', androidMetrics.movingRanges, androidMetrics);

        // Saku Insurance Orders
        const sakuInsMetrics = calculateXmRMetrics(individualVariableData.sakuInsurance, individualVariableDataFiltered.sakuInsurance, true);
        const sakuInsAnalysis = detectAnomalies(individualVariableData.sakuInsurance, sakuInsMetrics, lebaranExclusionIndices, "Saku Insurance Orders");
        createProfessionalChart('sakuInsChart', individualVariableData.sakuInsurance, individualVariableDataFiltered.sakuInsurance, sakuInsMetrics, sakuInsAnalysis.pointColors, 'Saku Insurance Orders', 'sakuInsAlerts', targetData.sakuInsurance);
        createProfessionalMRChart('sakuInsMRChart', sakuInsMetrics.movingRanges, sakuInsMetrics);

        // Saku Non-Insurance Orders
        const sakuNonInsMetrics = calculateXmRMetrics(individualVariableData.sakuNonInsurance, individualVariableDataFiltered.sakuNonInsurance, true);
        const sakuNonInsAnalysis = detectAnomalies(individualVariableData.sakuNonInsurance, sakuNonInsMetrics, lebaranExclusionIndices, "Saku Non-Insurance Orders");
        createProfessionalChart('sakuNonInsChart', individualVariableData.sakuNonInsurance, individualVariableDataFiltered.sakuNonInsurance, sakuNonInsMetrics, sakuNonInsAnalysis.pointColors, 'Saku Non-Insurance Orders', 'sakuNonInsAlerts', targetData.sakuNonInsurance);
        createProfessionalMRChart('sakuNonInsMRChart', sakuNonInsMetrics.movingRanges, sakuNonInsMetrics);

        // AREA PERFORMANCE ANALYSIS - ALL AREAS with professional design

        // BALI NUSRA Area
        const baliNusraMetrics = calculateXmRMetrics(individualVariableData.baliNusra, individualVariableDataFiltered.baliNusra, true);
        const baliNusraAnalysis = detectAnomalies(individualVariableData.baliNusra, baliNusraMetrics, lebaranExclusionIndices, "BALI NUSRA Area");
        createProfessionalChart('baliNusraChart', individualVariableData.baliNusra, individualVariableDataFiltered.baliNusra, baliNusraMetrics, baliNusraAnalysis.pointColors, 'BALI NUSRA Area Orders', 'baliNusraAlerts', targetData.baliNusra);
        createProfessionalMRChart('baliNusraMRChart', baliNusraMetrics.movingRanges, baliNusraMetrics);

        // JAKARTA Area
        const jakartaMetrics = calculateXmRMetrics(individualVariableData.jakarta, individualVariableDataFiltered.jakarta, true);
        const jakartaAnalysis = detectAnomalies(individualVariableData.jakarta, jakartaMetrics, lebaranExclusionIndices, "JAKARTA Area");
        createProfessionalChart('jakartaChart', individualVariableData.jakarta, individualVariableDataFiltered.jakarta, jakartaMetrics, jakartaAnalysis.pointColors, 'JAKARTA Area Orders', 'jakartaAlerts', targetData.jakarta);
        createProfessionalMRChart('jakartaMRChart', jakartaMetrics.movingRanges, jakartaMetrics);

        // JAVA 1 Area
        const java1Metrics = calculateXmRMetrics(individualVariableData.java1, individualVariableDataFiltered.java1, true);
        const java1Analysis = detectAnomalies(individualVariableData.java1, java1Metrics, lebaranExclusionIndices, "JAVA 1 Area");
        createProfessionalChart('java1Chart', individualVariableData.java1, individualVariableDataFiltered.java1, java1Metrics, java1Analysis.pointColors, 'JAVA 1 Area Orders', 'java1Alerts', targetData.java1);
        createProfessionalMRChart('java1MRChart', java1Metrics.movingRanges, java1Metrics);

        // JAVA 2 Area
        const java2Metrics = calculateXmRMetrics(individualVariableData.java2, individualVariableDataFiltered.java2, true);
        const java2Analysis = detectAnomalies(individualVariableData.java2, java2Metrics, lebaranExclusionIndices, "JAVA 2 Area");
        createProfessionalChart('java2Chart', individualVariableData.java2, individualVariableDataFiltered.java2, java2Metrics, java2Analysis.pointColors, 'JAVA 2 Area Orders', 'java2Alerts', targetData.java2);
        createProfessionalMRChart('java2MRChart', java2Metrics.movingRanges, java2Metrics);

        // JAVA 3 Area
        const java3Metrics = calculateXmRMetrics(individualVariableData.java3, individualVariableDataFiltered.java3, true);
        const java3Analysis = detectAnomalies(individualVariableData.java3, java3Metrics, lebaranExclusionIndices, "JAVA 3 Area");
        createProfessionalChart('java3Chart', individualVariableData.java3, individualVariableDataFiltered.java3, java3Metrics, java3Analysis.pointColors, 'JAVA 3 Area Orders', 'java3Alerts', targetData.java3);
        createProfessionalMRChart('java3MRChart', java3Metrics.movingRanges, java3Metrics);

        // KALIMANTAN Area
        const kalimantanMetrics = calculateXmRMetrics(individualVariableData.kalimantan, individualVariableDataFiltered.kalimantan, true);
        const kalimantanAnalysis = detectAnomalies(individualVariableData.kalimantan, kalimantanMetrics, lebaranExclusionIndices, "KALIMANTAN Area");
        createProfessionalChart('kalimantanChart', individualVariableData.kalimantan, individualVariableDataFiltered.kalimantan, kalimantanMetrics, kalimantanAnalysis.pointColors, 'KALIMANTAN Area Orders', 'kalimantanAlerts', targetData.kalimantan);
        createProfessionalMRChart('kalimantanMRChart', kalimantanMetrics.movingRanges, kalimantanMetrics);

        // SULAWESI Area
        const sulawesiMetrics = calculateXmRMetrics(individualVariableData.sulawesi, individualVariableDataFiltered.sulawesi, true);
        const sulawesiAnalysis = detectAnomalies(individualVariableData.sulawesi, sulawesiMetrics, lebaranExclusionIndices, "SULAWESI Area");
        createProfessionalChart('sulawesiChart', individualVariableData.sulawesi, individualVariableDataFiltered.sulawesi, sulawesiMetrics, sulawesiAnalysis.pointColors, 'SULAWESI Area Orders', 'sulawesiAlerts', targetData.sulawesi);
        createProfessionalMRChart('sulawesiMRChart', sulawesiMetrics.movingRanges, sulawesiMetrics);

        // SUMATERA 1 Area
        const sumatera1Metrics = calculateXmRMetrics(individualVariableData.sumatera1, individualVariableDataFiltered.sumatera1, true);
        const sumatera1Analysis = detectAnomalies(individualVariableData.sumatera1, sumatera1Metrics, lebaranExclusionIndices, "SUMATERA 1 Area");
        createProfessionalChart('sumatera1Chart', individualVariableData.sumatera1, individualVariableDataFiltered.sumatera1, sumatera1Metrics, sumatera1Analysis.pointColors, 'SUMATERA 1 Area Orders', 'sumatera1Alerts', targetData.sumatera1);
        createProfessionalMRChart('sumatera1MRChart', sumatera1Metrics.movingRanges, sumatera1Metrics);

        // SUMATERA 2 Area
        const sumatera2Metrics = calculateXmRMetrics(individualVariableData.sumatera2, individualVariableDataFiltered.sumatera2, true);
        const sumatera2Analysis = detectAnomalies(individualVariableData.sumatera2, sumatera2Metrics, lebaranExclusionIndices, "SUMATERA 2 Area");
        createProfessionalChart('sumatera2Chart', individualVariableData.sumatera2, individualVariableDataFiltered.sumatera2, sumatera2Metrics, sumatera2Analysis.pointColors, 'SUMATERA 2 Area Orders', 'sumatera2Alerts', targetData.sumatera2);
        createProfessionalMRChart('sumatera2MRChart', sumatera2Metrics.movingRanges, sumatera2Metrics);

        // SUMATERA 3 Area
        const sumatera3Metrics = calculateXmRMetrics(individualVariableData.sumatera3, individualVariableDataFiltered.sumatera3, true);
        const sumatera3Analysis = detectAnomalies(individualVariableData.sumatera3, sumatera3Metrics, lebaranExclusionIndices, "SUMATERA 3 Area");
        createProfessionalChart('sumatera3Chart', individualVariableData.sumatera3, individualVariableDataFiltered.sumatera3, sumatera3Metrics, sumatera3Analysis.pointColors, 'SUMATERA 3 Area Orders', 'sumatera3Alerts', targetData.sumatera3);
        createProfessionalMRChart('sumatera3MRChart', sumatera3Metrics.movingRanges, sumatera3Metrics);

        console.log('✅ All individual variable charts created with professional design');
    } catch (error) {
        console.error('❌ Error creating individual variable charts:', error);
    }
}

// Create XmR Charts for Northstar Metric with Professional Design
function createProfessionalXmRCharts() {
    console.log('🚀 Creating Northstar XmR charts with professional design...');

    try {
        // Calculate metrics using filtered data (excluding Lebaran holidays)
        const metrics = calculateXmRMetrics(ordersData, filteredOrdersData, true);
        const analysis = detectAnomalies(ordersData, metrics, lebaranExclusionIndices, "Total Orders");

        // Populate metrics grid with updated values
        const ordersMetricsDiv = document.getElementById('ordersMetrics');
        if (ordersMetricsDiv) {
            ordersMetricsDiv.innerHTML = `
                <div class="metric-card">
                    <div class="metric-card-title">Current Week</div>
                    <div class="metric-card-value">${ordersData[ordersData.length - 1]}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-title">Previous Week</div>
                    <div class="metric-card-value">${ordersData[ordersData.length - 2]}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-title">Center Line</div>
                    <div class="metric-card-value">${metrics.centerLineX.toFixed(0)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-title">Upper Limit</div>
                    <div class="metric-card-value">${metrics.upperNaturalProcessLimit.toFixed(0)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-title">Lower Limit</div>
                    <div class="metric-card-value">${metrics.lowerNaturalProcessLimit.toFixed(0)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-card-title">Process Status</div>
                    <div class="metric-card-value">${analysis.anomalies.filter(a => a.type !== 'holiday_exclusion').length === 0 ? 'In Control' : 'Anomalies Detected'}</div>
                </div>
            `;
        }

        // Create the main charts using filtered data for control limits WITH TARGET LINE
        createProfessionalChart('ordersChart', ordersData, filteredOrdersData, metrics, analysis.pointColors, 'Total Orders', 'ordersAlerts', targetData.totalOrders);
        createProfessionalMRChart('ordersMRChart', metrics.movingRanges, metrics);

        console.log('✅ Northstar XmR charts created with professional design');
        return { metrics, analysis };
    } catch (error) {
        console.error('❌ Error creating Northstar XmR charts:', error);
    }
}

// Enhanced Navigation Pills Functionality
function enhanceNavigationElements() {
    console.log('🚀 Enhancing navigation elements...');

    try {
        // Navigation pills enhancement
        document.querySelectorAll('.nav-pill, .nav-link').forEach(pill => {
            pill.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                    });

                    // Visual feedback
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 150);
                }
            });
        });

        // Back to summary buttons enhancement
        document.querySelectorAll('.back-to-summary').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector('#executive-summary');
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });

                    // Update active tab
                    document.querySelectorAll('.nav-tab').forEach(tab => {
                        tab.classList.remove('active');
                        if (tab.getAttribute('href') === '#executive-summary') {
                            tab.classList.add('active');
                        }
                    });
                }
            });
        });

        console.log('✅ Navigation elements enhanced successfully');
    } catch (error) {
        console.error('❌ Error enhancing navigation elements:', error);
    }
}

// MAIN DOCUMENT READY EVENT HANDLER with Professional Integration
// At the bottom of script.js, update this:
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM Content Loaded - Starting MS Channel Analysis');
    console.log('🌐 Running in web environment (OnRender)');

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    } else {
        console.log(`✅ Chart.js loaded, version: ${Chart.version || 'unknown'}`);
    }

    try {
        // Set current date
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const currentDateElement = document.getElementById('currentDate');
        const execDateElement = document.getElementById('execDate');
        if (currentDateElement) currentDateElement.textContent = currentDate;
        if (execDateElement) execDateElement.textContent = currentDate;

        // Initialize professional navigation FIRST
        initializeProfessionalNavigation();

        // CRITICAL: Load MTD data BEFORE creating any charts
        console.log('⏳ Loading MTD data from JSON files...');
        mtdData = await buildMTDDataFromRaw();
        
        if (!mtdData) {
            throw new Error('Failed to load MTD data');
        }
        
        console.log('✅ MTD data loaded successfully');

        // Now create all charts and tables
        await createProfessionalMTDTable();
        createProfessionalXmRCharts();
        createAllRegionalCharts();
        createAllIndividualVariableCharts();
        createAllAndroidAreaCharts();

        // Enhance navigation elements
        setTimeout(() => {
            enhanceNavigationElements();
        }, 1000);

        console.log('🎉 All professional charts and analyses created successfully');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        
        // Show user-friendly error message
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div style="background: #fee2e2; border: 2px solid #dc2626; border-radius: 12px; padding: 30px; margin: 40px 0;">
                    <h2 style="color: #dc2626; margin-top: 0;">⚠️ Data Loading Error</h2>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Unable to load required data files. Please check:
                    </p>
                    <ul style="color: #374151; line-height: 1.8;">
                        <li>JSON files are in the repository root directory</li>
                        <li>File names match exactly: "Extract - Daily Order.json" and "Monthly - Raw Target.json"</li>
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
    }
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error(`❌ Global Error: ${e.message} at ${e.filename}:${e.lineno}`);
});

// Export professional analysis object with dynamic data loading
window.ProfessionalMSChannelAnalysis = {
    version: 'v16.0 - Dynamic Data Loading from Raw JSON Files',
    data: realMSData,
    ordersData: ordersData,
    individualVariableData: individualVariableData,
    regionalData: regionalData,
    targetData: targetData,
    regionalTargetData: regionalTargetData,
    mtdData: mtdData,
    // Dynamic data loading functions
    buildMTDDataFromRaw: buildMTDDataFromRaw,
    loadDailyOrders: loadDailyOrders,
    loadMonthlyTargets: loadMonthlyTargets,
    getCurrentMonthDay: getCurrentMonthDay,
    // Calculation functions
    calculateXmRMetrics: calculateXmRMetrics,
    detectAnomalies: detectAnomalies,
    // Chart creation functions
    createAllRegionalCharts: createAllRegionalCharts,
    createRegionalLineChart: createRegionalLineChart,
    createProfessionalMTDTable: createProfessionalMTDTable,  // Fixed typo: removed extra 'D'
    initializeProfessionalNavigation: initializeProfessionalNavigation
};  // Properly closed
