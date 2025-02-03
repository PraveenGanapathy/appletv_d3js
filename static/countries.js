document.addEventListener('DOMContentLoaded', function() {
    const width = 960;
    const height = 500;
    
    const svg = d3.select("#country-map")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "1000");

    const projection = d3.geoMercator()
        .scale(140)
        .center([0, 20])
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    Promise.all([
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
        fetch("https://restcountries.com/v3.1/all").then(response => response.json()),
        fetch('/api/countries').then(response => response.json())
    ]).then(([worldData, restCountries, countryData]) => {
        // Create mapping from 3-letter to 2-letter codes
        const codeMapping = new Map();
        restCountries.forEach(country => {
            if (country.cca2 && country.cca3) {
                codeMapping.set(country.cca3, country.cca2);
            }
        });

        // Process country data to get counts
        const countryCounts = {};
        countryData.forEach(item => {
            countryCounts[item.code] = item.count;
        });

        // Create color scale for gradient
        const colorScale = d3.scaleSequential()
            .domain([0, d3.max(Object.values(countryCounts)) || 1])
            .interpolator(d3.interpolateGreens);

        // Draw the map
        svg.append("g")
            .selectAll("path")
            .data(worldData.features)
            .join("path")
            .attr("d", path)
            .attr("fill", d => {
                const twoLetterCode = codeMapping.get(d.id);
                const count = countryCounts[twoLetterCode] || 0;
                return count > 0 ? colorScale(count) : "#e0e0e0";
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => {
                const twoLetterCode = codeMapping.get(d.id);
                const countryName = d.properties.name;
                const count = countryCounts[twoLetterCode] || 0;
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${countryName}</strong><br/>
                    Movies Available: ${count}<br/>
                    ${count > 0 ? 'Available' : 'Not Available'}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add legend and other visualization elements
        const legendWidth = 200;
        const legendHeight = 10;
        const legendX = 20;
        const legendY = height - 50;

        const legendScale = d3.scaleLinear()
            .domain([0, d3.max(Object.values(countryCounts))])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5);

        const legend = svg.append("g")
            .attr("transform", `translate(${legendX},${legendY})`);

        // Create gradient
        const gradient = legend.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("x2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(0));

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(d3.max(Object.values(countryCounts))));

        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#gradient)");

        legend.append("g")
            .attr("transform", `translate(0,${legendHeight})`)
            .call(legendAxis);

        legend.append("text")
            .attr("x", legendWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .text("Number of Movies Available");
    })
    .catch(error => {
        console.error("Error loading data:", error);
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "red")
            .text("Error loading map data");
    });
});
