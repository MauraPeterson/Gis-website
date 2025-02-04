const incomeDataURL = "https://api.census.gov/data/2023/acs/acs1/subject?get=NAME,S1903_C03_001E&for=county:*&in=state:08";
//const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=group(B25085)&ucgid=pseudo(0100000US$0500000)";
const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=NAME,B25085_001E&ucgid=pseudo(0100000US$0500000)";

const geoFileType = ".geo.json";
var intersectingPlaces;
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
  resetMap(0,0,2);
  loadGeoJSON("resources/world.geo.json-master/countries" + geoFileType);

  //ColoradoCounties.forEach(county => {
  //  loadGeoJSON(baseURL + county + geoFileType);
  //});
}

function resetMap(lat, long, zoom) {
  if (map) {
    map.remove();
  }
  console.log(lat + ", " + long + ", "+ zoom)
  map = L.map('map').setView([lat, long], zoom);

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

async function loadPhoenixUpdated() {
  const phoenixUpResponse = await fetch("resources/updated/phoenix_updated.json");
  const phoenixTractsData = await phoenixUpResponse.json();

  const CensusTractResponse = await fetch("resources/census-tracts/AZ.json");
  const censusTractsData = await CensusTractResponse.json();

  const phoenixResponse = await fetch("resources/cities/phoenix.json");
  const phoenixBoundaryData = await phoenixResponse.json();

  censusTractsData.features.forEach(feature => {
    if (phoenixTractsData.GEOIDS.includes(feature.properties.GEOID)) {
      addFeature(feature, phoenixBoundaryData);

    }
  });

}

function addFeature(features, regionData) {
  L.geoJSON(features, {
    
    style: function (feature) {

      return {
        color: '#FFFF00', // Yellow color for the overlapping tracts
        weight: 2,
        fillOpacity: 0.5 // Adjust opacity as needed

      };
    },
    onEachFeature: function (feature, layer) {
      const name = feature.properties.NAMELSAD || 'No name available';
      const tractce = feature.properties.TRACTCE || 'No tractce available';
      layer.bindPopup("Name: " + name + "<br>TractCE: " + tractce); 
    }
  }).addTo(map);
}

// Function to check if a tract intersects with the Phoenix boundary
function intersects(tractGeometry, phoenixBoundaryData) {
  const tractCoordinates = tractGeometry.coordinates[0];
  // Check if the tract has enough coordinates
  if (tractCoordinates.length < 4 || tractGeometry.type !== "Polygon") {
    console.warn('Tract has insufficient coordinates:', tractCoordinates);
    return false; // Skip this tract
  } 
  const phoenixPolygon = turf.multiPolygon(phoenixBoundaryData.features[0].geometry.coordinates);
  const tractPolygon = turf.polygon([tractCoordinates]);
  const doesIntersect = turf.booleanContains(phoenixPolygon, tractPolygon) || turf.booleanOverlap(phoenixPolygon, tractPolygon);
  return doesIntersect;
}

async function showPhoenix() {
  resetMap(33.5, -112, 10);
  try {
    console.log("Loading Phoenix boundary...");
    const phoenixResponse = await fetch("resources/cities/phoenix.json");
    const phoenixBoundaryData = await phoenixResponse.json();

    // Add Phoenix boundary to the map
    const phoenixLayer = L.geoJSON(phoenixBoundaryData).addTo(map);

    console.log("Loading census tracts...");
    const censusResponse = await fetch('resources/census-tracts/AZ.json'); // Path to your census tracts GeoJSON
    const censusTractsData = await censusResponse.json();
    var azCensusTractCount = 0;
    var phoenixCensusTractCount = 0;
    const intersectingTracts = [];

    // Create a layer for the census tracts that overlap with Phoenix
    const overlappingTracts = L.geoJSON(censusTractsData, {
      filter: function (feature) {
        azCensusTractCount++;
        return intersects(feature.geometry, phoenixBoundaryData);
      },
      style: function (feature) {

        return {
          color: '#FFFF00', // Yellow color for the overlapping tracts
          weight: 2,
          fillOpacity: 0.5 // Adjust opacity as needed

        };
      },
      onEachFeature: function (feature, layer) {
        console.log(feature.properties.GEOID);
        intersectingTracts.push(feature.properties.GEOID);
        phoenixCensusTractCount++;
        layer.bindPopup(feature.properties.name || 'No name available'); // Ensure there's a fallback
      }
    }).addTo(map);
    console.log("AZ Census Tract Count: " + azCensusTractCount);
    console.log("Phoenix Census Tract Count: " + phoenixCensusTractCount);
    console.log("Phoenix census tracts loaded successfully.");
    phoenixBoundaryData.intersectingTractIds = intersectingTracts;
    console.log(intersectingTracts);
    intersectingPlaces = intersectingTracts;
  } catch (error) {
    console.error('Error loading Phoenix or census tracts:', error);
  }
}

async function writeIntersects() {
  try {

    const dataToSave = { GEOIDS: intersectingPlaces };

    console.log(JSON.stringify(intersectingPlaces));
    fetch('http://localhost:3000/save-phoenix-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSave),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to save data');
        console.log('Data saved successfully');
      })

  } catch (error) {
    console.error('Error saving data:', error);
  }
}


function loadStates(event) {
  var states = event.target.feature.properties.states;
  console.log(states.length);
  for (var i = 0; i < states.length; i++) {
    console.log("resources/world.geo.json-master/countries/" + event.target.feature.id + "/" + states[i].code + geoFileType);
    loadGeoJSON("resources/world.geo.json-master/countries/" + event.target.feature.id + "/" + states[i].code + geoFileType);
  }
}

function loadCounties(event) {
  var counties = event.target.feature.properties.counties;
  console.log(event);
  for (var i = 0; i < counties.length; i++) {
    console.log("resources/world.geo.json-master/countries/" + event.target.feature.properties.country + "/" + event.target.feature.id + "/" + counties[i].name + geoFileType);
    loadGeoJSON("resources/world.geo.json-master/countries/" + event.target.feature.properties.country + "/" + event.target.feature.id + "/" + counties[i].name + geoFileType);
  }
}

function layerHandler(e) {
  var event = e;
  console.log(event.target.feature.properties.kind);
  console.log(event);
  var lat = event.latlng.lat;
  var long = event.latlng.lng;
  var zoom = 3;
  resetMap(lat, long, zoom);
  geoJsonLayers = [];
  if (event.target.feature.properties.kind == "Country") {
    loadStates(event);
  } else if (event.target.feature.properties.kind == "State") {
    console.log("State");
    loadCounties(event)
  } else if (event.target.feature.properties.kind == "county") {
    loadGeoJSON('resources/census-tracts/AZ.json');
  } else {
    console.log("resources/world.geo.json-master/countries/" + event.target.feature.id + geoFileType);
    loadGeoJSON("resources/world.geo.json-master/countries/" + event.target.feature.id + geoFileType);
  }

  
}

function loadShapeFile() {
  fetch('resources/cb_2023_04_bg_500k.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
      // Add GeoJSON layer to the map
      L.geoJSON(data, {
        onEachFeature: function (feature, layer) {
          layer.bindPopup(feature.properties.name); // Adjust the property to display in popup
        }
      }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON:', error));
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
document.getElementById('phoenixBtn').addEventListener('click', () => { showPhoenix() });
document.getElementById('writeBtn').addEventListener('click', () => { writeIntersects() });
document.getElementById('getPhoenixUpdated').addEventListener('click', () => { loadPhoenixUpdated() });