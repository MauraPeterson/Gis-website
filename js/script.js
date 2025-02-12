const incomeDataURL = "https://api.census.gov/data/2023/acs/acs1/subject?get=NAME,S1903_C03_001E&for=county:*&in=state:08";
//const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=group(B25085)&ucgid=pseudo(0100000US$0500000)";
const priceAskedURL = "https://api.census.gov/data/2022/acs/acs5?get=NAME,B25085_001E&ucgid=pseudo(0100000US$0500000)";

const geoFileType = ".geo.json";
var intersectingPlaces;
var geoJsonLayers = [];
var selectedCity = "phoenix";


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

async function getDataFromFile(filename) {
  try {

    const response = await fetch(filename);

    if (!response.ok) {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    return data;
  } catch (error) {
    return null;
  }
}

async function load_updatedTractsInCity(cityname, originalCensusFileName) {
  try {

    const tractsData = await getDataFromFile(`resources/updated/${cityname}_updated.json`);

    if (tractsData == null) {
      console.log("First time load. This may take up to 5 minutes. Future loads will be instant.");
      return false;
    }

    const censusTractsData = await getDataFromFile(originalCensusFileName);
    const cityBoundaryData = await getDataFromFile(`resources/cities/${cityname}.json`);

    if (!tractsData || !censusTractsData || !cityBoundaryData) {
      return false;
    }

    censusTractsData.features.forEach(feature => {
      if (tractsData.GEOIDS.includes(feature.properties.GEOID)) {
        addFeature(feature, cityBoundaryData);
      }
    });

    return true;
  } catch (error) {
    return false;
  }
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

// Function to check if a tract intersects with the city boundary
function intersects(tractGeometry, cityBoundaryData) {
  const tractCoordinates = tractGeometry.coordinates[0];
  // Check if the tract has enough coordinates
  if (tractCoordinates.length < 4 || tractGeometry.type !== "Polygon") {
    console.warn('Tract has insufficient coordinates:', tractCoordinates);
    return false; // Skip this tract
  } 
  var cityPolygon;
  if (cityBoundaryData.features[0].geometry.type == "Polygon") {
    cityPolygon = turf.polygon(cityBoundaryData.features[0].geometry.coordinates);
  } else {
    cityPolygon = turf.multiPolygon(cityBoundaryData.features[0].geometry.coordinates);
  }

  const tractPolygon = turf.polygon([tractCoordinates]);
  const doesIntersect = turf.booleanContains(cityPolygon, tractPolygon) || turf.booleanOverlap(cityPolygon, tractPolygon);
  
  return doesIntersect;
}

async function showCityCensusTracts(cityBoundaryData, censusTractFile, cityname) {
  var city_updatedFileExists = await load_updatedTractsInCity(cityname, censusTractFile);
  if (city_updatedFileExists) {
    console.log(city_updatedFileExists);
    return;
  }
  try { 

    console.log("Loading census tracts...");
    const censusTractsData = await getDataFromFile(censusTractFile);
    console.log(censusTractFile)
    console.log(cityBoundaryData.features)
    var stateCensusTractCount = 0;
    var cityCensusTractCount = 0;
    const intersectingTracts = [];
    // Create a layer for the census tracts that overlap with the city
    const overlappingTracts = L.geoJSON(censusTractsData, {
      filter: function (feature) {
        stateCensusTractCount++;
        console.log((stateCensusTractCount / 4773) * 100);
        
        return intersects(feature.geometry, cityBoundaryData);
        
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
        cityCensusTractCount++;
        layer.bindPopup(feature.properties.name || 'No name available'); // Ensure there's a fallback
      }
    }).addTo(map);
    console.log("State Census Tract Count: " + stateCensusTractCount);
    console.log("City Census Tract Count: " + cityCensusTractCount);
    console.log("City census tracts loaded successfully.");
    cityBoundaryData.intersectingTractIds = intersectingTracts;
    console.log(intersectingTracts);
    intersectingPlaces = intersectingTracts;

    writeIntersects(cityname);
  } catch (error) {
    console.error('Error loading city or census tracts:', error);
  }
}

function getBoundaryCenter(boundaryData) {
  const lat = Number(boundaryData.features[0].properties.INTPTLAT)
  const long = Number(boundaryData.features[0].properties.INTPTLON)
  return [lat, long];
}

async function showCity(censusTract, cityname, stateCode) {
  resetMap(+35.1852121, -111.6206977, 7)
  try {
    console.log(`Loading ${cityname} boundary...`);
    const cityResponse = await fetch(`resources/cities/${cityname}.json`);
    const cityBoundaryData = await cityResponse.json();
    const [ lat, long ] = getBoundaryCenter(cityBoundaryData);
    console.log(long);
    resetMap(lat, long, 9)
    console.log(lat, long);

    // Add city boundary to the map
    const cityLayer = L.geoJSON(cityBoundaryData).addTo(map);

    if (censusTract) {
      showCityCensusTracts(cityBoundaryData, `resources/census-tracts/${stateCode}.json`, cityname);
    }
  } catch (error) {
    console.error('Error loading city or census tracts:', error);
  }
}



async function writeIntersects(city) {
  try {

    const dataToSave = { GEOIDS: intersectingPlaces };

    console.log(JSON.stringify(intersectingPlaces));
    const url2 = `http://localhost:3000/save-city-blockgroups?city=${city}`;
    console.log(url2);
    fetch(url2, {
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
    console.log("resources/world.geo.json-master/countries/" + event.target.feature.properties.country + "/" + event.target.feature.properties.state_code + "/" + counties[i] + geoFileType);
    loadGeoJSON("resources/world.geo.json-master/countries/" + event.target.feature.properties.country + "/" + event.target.feature.properties.state_code + "/" + counties[i] + geoFileType);
  }
}

function layerHandler(e) {
  var event = e;
  console.log(event.target.feature.properties.kind);
  console.log(event);
  console.log(event.target.feature.properties.kind == "county");
  var lat = event.latlng.lat;
  var long = event.latlng.lng;
  var zoom = 3;
  resetMap(lat, long, zoom);
  geoJsonLayers = [];
  if (event.target.feature.properties.kind == "Country") {
    loadStates(event);
  } else if (event.target.feature.id && event.target.feature.id.includes("USA-")) {
    console.log("State");
    loadCounties(event)
  } else if (event.target.feature.properties.kind == "county") {
    console.log("County");
    console.log(event.target.feature.properties.state);
    console.log(event.target.feature.properties.name);
    console.log(`resources/census-tracts/${event.target.feature.properties.state}/${event.target.feature.properties.name}.geo.json`);
    loadGeoJSON(`resources/census-tracts/${event.target.feature.properties.state}/${event.target.feature.properties.name}.geo.json`);
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

  function updateSelectedCity(cityname){
    selectedCity = cityname.toLowerCase();
  }

initializeMap();
// Apply colors based on income after all GeoJSON is loaded
// Apply colors based on income after all GeoJSON is loaded
document.getElementById('incomeBtn').addEventListener('click', () => { applyColors(incomeDataURL, "Median Income") });
document.getElementById('unitsSoldBtn').addEventListener('click', () => { applyColors(priceAskedURL, "Units Sold") });
document.getElementById('city-blockBtn').addEventListener('click', () => { showCity(true, selectedCity, "AZ") });
document.getElementById('writeBtn').addEventListener('click', () => { writeIntersects(selectedCity) });
document.getElementById('city-select').addEventListener('change', () => { updateSelectedCity(document.getElementById("city-select").value) });