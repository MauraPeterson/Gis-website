import { ColoradoCounties } from './URL/ColoradoCounties.js';

var incomeData = {};
var priceAsked = {};
var priceAskedAggregate = {};

const incomeDataURL = "https://api.census.gov/data/2023/acs/acs1/subject?get=NAME,S1903_C03_001E&for=county:*&in=state:08";
//const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=group(B25085)&ucgid=pseudo(0100000US$0500000)";
const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=NAME,B25085_001E&ucgid=pseudo(0100000US$0500000)";
const priceAskedAggragateURL = "";

const baseURL = "resources/world.geo.json-master/countries/USA/CO/";
const geoFileType = ".geo.json";

var geoJsonLayers = [];

var map;

// Ensure map resizes properly on window resize
window.addEventListener('resize', function () {
  map.invalidateSize();
});

// Fetch income data and then load GeoJSON
async function initializeMap() {
  //incomeData = await fetchData(incomeDataURL);
  //priceAsked = await fetchData(priceAskedURL);
  resetMap();
  loadGeoJSON("resources/world.geo.json-master/countries" + geoFileType);

  //ColoradoCounties.forEach(county => {
  //  loadGeoJSON(baseURL + county + geoFileType);
  //});
}

function resetMap(lat, long, zoom) {
  if (map) {
    map.remove();
  }
  map = L.map('map').setView([38, -99.59], 5);

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

function layerHandler(e) {
  var event = e;
  console.log(event);
  var lat = event.target._renderer._center.lat;
  var long = event.target._renderer._center.long;
  var zoom = 3;
  resetMap(lat, long, zoom);
  geoJsonLayers = [];
  console.log("resources/world.geo.json-master/countries/" + event.target.feature.id + geoFileType);
  loadGeoJSON("resources/world.geo.json-master/countries/" + event.target.feature.id + geoFileType);
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
          //const medianIncome = incomeData[countyName] || "Data not available";
          //const unitsSold = priceAsked[countyName] || "Data not available";
          //layer.bindPopup('County: ' + countyName + '<br>Median Income: ' + medianIncome + '<br>Units Sold: ' + unitsSold);
          var popUp = 'County: ' + countyName;
          layer.bindPopup(popUp);
          layer.addEventListener("click", layerHandler);
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

// Function to change colors based on collection of data
async function applyColors(URL, dataName) {
  var collection = await fetchData(URL)
  console.log("color: " + geoJsonLayers.length);
  var max = Math.max(...Object.values(collection))
  var min = Math.min(...Object.values(collection))
  console.log("max: " + max + ", min: " + min);
  geoJsonLayers.forEach(layer => {
    layer.setStyle(function (feature) {
      console.log(feature.properties);
      const countyName = feature.properties.name.replace(/ County, Colorado/, '');
      const data = collection[countyName] || "Data Not Available"; // Get income data
      var popUp = 'County: ' + countyName + "<br>" + dataName + ": " + data;
      layer.bindPopup(popUp);
      return { color: getColor(data, max, min) }; // Set color based on income
    });
  });
}

// Get the color for data based on where it is in the data range
function getColor(data, max, min) {
  var range = max - min;
  console.log(max - (range * (1 / 8)));
  return data === "Data Not Available" ? '#FFFFFF' :
         data > max - (range * (1 / 8)) ? '#800026' : // Dark red
         data > max - range * (2 / 8) ? '#BD0026' :
         data > max - range * (3 / 8) ? '#E31A1C' :
         data > max - range * (4 / 8) ? '#FC4E2A' :
         data > max - range * (5 / 8) ? '#FD8D3C' :
         data > max - range * (6 / 8) ? '#FEB24C' :
         data > max - (range * (7 / 8)) ? '#FED976' :
         '#FFEDA0'; // Light yellow
}

initializeMap();
// Apply colors based on income after all GeoJSON is loaded
// Apply colors based on income after all GeoJSON is loaded
document.getElementById('incomeBtn').addEventListener('click', () => { applyColors(incomeDataURL, "Median Income") });
document.getElementById('unitsSoldBtn').addEventListener('click', () => { applyColors(priceAskedURL, "Units Sold") });