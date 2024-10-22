var incomeData = {};
var priceAsked = {};
var priceAskedAggregate = {};

const incomeDataURL = "https://api.census.gov/data/2023/acs/acs1/subject?get=NAME,S1903_C03_001E&for=county:*&in=state:08";
//const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=group(B25085)&ucgid=pseudo(0100000US$0500000)";
const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=NAME,B25085_001E&ucgid=pseudo(0100000US$0500000)";
const priceAskedAggragateURL = "";

var geoJsonLayers = []; 


// Initialize the map
var map = L.map('map').setView([38, -99.59], 5);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Ensure map resizes properly on window resize
window.addEventListener('resize', function () {
    map.invalidateSize();
});

const countyFiles = [
    "resources/world.geo.json-master/countries/USA/CO/Adams.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Alamosa.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Arapahoe.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Archuleta.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Baca.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Bent.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Boulder.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Chaffee.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Cheyenne.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Clear Creek.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Conejos.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Costilla.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Crowley.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Custer.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Delta.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Denver.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Dolores.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Douglas.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Eagle.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/El Paso.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Elbert.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Fremont.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Garfield.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Gilpin.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Grand.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Gunnison.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Hinsdale.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Huerfano.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Jackson.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Jefferson.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Kiowa.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Kit Carson.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/La Plata.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Lake.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Larimer.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Las Animas.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Lincoln.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Logan.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Mesa.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Mineral.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Moffat.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Montezuma.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Montrose.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Morgan.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Otero.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Ouray.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Park.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Phillips.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Pitkin.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Prowers.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Pueblo.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Rio Blanco.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Rio Grande.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Routt.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Saguache.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/San Juan.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/San Miguel.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Sedgwick.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Summit.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Teller.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Washington.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Weld.geo.json",
    "resources/world.geo.json-master/countries/USA/CO/Yuma.geo.json"
];

// Function to encode file paths
function encodePath(filePath) {
    return filePath.replace(/ /g, '%20');
}

// Fetch income data and then load GeoJSON
async function initializeMap() {
    incomeData = await fetchData(incomeDataURL);
    priceAsked = await fetchData(priceAskedURL);
    // Loop through each county file and call the loadGeoJSON function
    countyFiles.forEach(filePath => {
        loadGeoJSON(filePath);
    });
}

function loadGeoJSON(filePath) {
    // Load GeoJSON data
    fetch(filePath) // Ensure this path is correct based on your server setup
        .then(response => response.json())
        .then(data => {
            // Add the GeoJSON layer to the map
            const layer = L.geoJSON(data, {
                onEachFeature: function (feature, layer) {
                    const countyName = feature.properties.name;
                    const medianIncome = incomeData[countyName] || "Data not available";
                    const unitsSold = priceAsked[countyName] || "Data not available";
                    layer.bindPopup('County: ' + countyName + '<br>Median Income: ' + medianIncome + '<br>Units Sold: ' + unitsSold);
                }
            }).addTo(map);

            geoJsonLayers.push(layer);
            
        })
        .catch(error => console.error('Error loading GeoJSON:', error));
}

async function fetchData(url) {
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Convert the response to a more usable format
        const thisData = {};
        data.slice(1).forEach(row => {
            if (row[0].indexOf(" County, Colorado") != -1) {
                const countyName = row[0].replace(/ County, Colorado/, ''); // County name
                const row1 = row[1]; 
                console.log(countyName + ": " + row1);
                thisData[countyName] = row1;
            }
        });
        
        return thisData;

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Function to change colors based on income
function applyIncomeColors() {
    console.log("color: " +geoJsonLayers.length);
    
    geoJsonLayers.forEach(layer => {
        layer.setStyle(function (feature) {
            const countyName = feature.properties.name.replace(/ County, Colorado/, '');
            const medianIncome = incomeData[countyName] || 0; // Get income data
            return { color: getColor(medianIncome) }; // Set color based on income
        });
    });
}

function applySoldColors() {
    console.log("color: " + geoJsonLayers.length);
    var max = Math.max(...Object.values(priceAsked))
    var min = Math.min(...Object.values(priceAsked))

    console.log("max: " + max + ", min: " + min);
    geoJsonLayers.forEach(layer => {
        layer.setStyle(function (feature) {
            const countyName = feature.properties.name.replace(/ County, Colorado/, '');
            const data = priceAsked[countyName] || 0; // Get income data
            return { color: getSoldColor(data, max, min) }; // Set color based on income
        });
    });
}

function getSoldColor(data, max, min) {
    var range = max - min;
    console.log( max - (range * (1 / 8)));
    return data > max - (range * (1/8)) ? '#800026' : // Dark red
        data > max - range * (2/8) ? '#BD0026' :
            data > max - range * (3/8) ? '#E31A1C' :
                data > max - range * (4 / 8) ? '#FC4E2A' :
                    data > max - range * (5 / 8) ? '#FD8D3C' :
                        data > max - range * (6 / 8) ? '#FEB24C' :
                            data > max - (range * (7 / 8)) ? '#FED976' :
                                '#FFEDA0'; // Light yellow
}

function getColor(income) {
    return income > 100000 ? '#800026' : // Dark red
           income > 90000 ? '#BD0026' :
           income > 80000 ? '#E31A1C' :
           income > 70000 ? '#FC4E2A' :
           income > 60000 ? '#FD8D3C' :
           income > 50000 ? '#FEB24C' :
           income > 40000 ? '#FED976' :
           '#FFEDA0'; // Light yellow
}

initializeMap();
// Apply colors based on income after all GeoJSON is loaded
// Apply colors based on income after all GeoJSON is loaded
document.getElementById('incomeBtn').addEventListener('click', applyIncomeColors);
document.getElementById('unitsSoldBtn').addEventListener('click', applySoldColors);