document.addEventListener('DOMContentLoaded', function() {
    let animationInterval;
    
    // Create tooltip first
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "1000");

    // Set dimensions
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Define updateVisualization function first
    function updateVisualization(minYear, maxYear) {
        if (!minYear || !maxYear || isNaN(minYear) || isNaN(maxYear)) {
            console.error('Invalid year parameters:', minYear, maxYear);
            return;
        }

        fetch(`/api/content?minYear=${minYear}&maxYear=${maxYear}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data)) throw new Error('Invalid data format received');
                
                // Clear existing charts
                d3.selectAll(".chart-box svg").remove();

                if (data.length > 0) {
                    drawTypeDistribution(data);
                    drawRatingDistribution(data);
                    drawTopGenres(data);
                    drawGenreTrend(data);
                } else {
                    console.log(`No data available for year range ${minYear}-${maxYear}`);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }

    function drawTypeDistribution(data) {
        const typeCounts = d3.rollup(data, v => v.length, d => d.type);
        const chartData = Array.from(typeCounts, ([key, value]) => ({ type: key, count: value }));

        const svg = d3.select("#chart-type")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(chartData.map(d => d.type))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.count)])
            .nice()
            .range([height, 0]);

        svg.selectAll("rect")
            .data(chartData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.type))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.count))
            .attr("fill", "steelblue")
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .html(`Type: ${d.type}<br>Count: ${d.count}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));
    }

    function drawRatingDistribution(data) {
        const ratings = data.map(d => d.imdbAverageRating).filter(d => d !== null);
        
        const svg = d3.select("#chart-ratings")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const histogram = d3.histogram()
            .domain([0, 10])
            .thresholds(20);

        const bins = histogram(ratings);

        const x = d3.scaleLinear()
            .domain([0, 10])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .nice()
            .range([height, 0]);

        svg.selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
            .attr("x", d => x(d.x0))
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("y", d => y(d.length))
            .attr("height", d => height - y(d.length))
            .attr("fill", "purple")
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .html(`Rating Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br>Count: ${d.length}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));
    }

    function drawTopGenres(data) {
        const genreCounts = {};
        data.forEach(d => {
            if (d.genres) {
                d.genres.split(', ').forEach(genre => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                });
            }
        });

        const chartData = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([genre, count]) => ({ genre, count }));

        const svg = d3.select("#chart-top-genres")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(chartData.map(d => d.genre))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.count)])
            .nice()
            .range([height, 0]);

        svg.selectAll("rect")
            .data(chartData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.genre))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.count))
            .attr("fill", "green")
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .html(`Genre: ${d.genre}<br>Count: ${d.count}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y));
    }

    function drawGenreTrend(data) {
        const genreTrend = {};
        data.forEach(d => {
            if (d.genres) {
                d.genres.split(', ').forEach(genre => {
                    if (!genreTrend[genre]) genreTrend[genre] = {};
                    if (!genreTrend[genre][d.releaseYear]) genreTrend[genre][d.releaseYear] = 0;
                    genreTrend[genre][d.releaseYear]++;
                });
            }
        });

        const selectedGenres = Object.keys(genreTrend).slice(0, 10);
        const chartData = selectedGenres.map(genre => ({
            genre,
            values: Object.entries(genreTrend[genre])
                .map(([year, count]) => ({ year: +year, count }))
                .sort((a, b) => a.year - b.year)
        }));

        const svg = d3.select("#chart-genre-trend")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const years = data.map(d => +d.releaseYear);
        const x = d3.scaleLinear()
            .domain([d3.min(years), d3.max(years)])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData.flatMap(d => d.values.map(v => v.count))) || 1])
            .nice()
            .range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10);

        chartData.forEach(genreData => {
            const line = d3.line()
                .x(d => x(d.year))
                .y(d => y(d.count));

            svg.append("path")
                .datum(genreData.values)
                .attr("fill", "none")
                .attr("stroke", color(genreData.genre))
                .attr("stroke-width", 2)
                .attr("d", line)
                .on("mouseover", (event, d) => {
                    const [xPos] = d3.pointer(event);
                    const xValue = x.invert(xPos);
                    const closestData = genreData.values.reduce((prev, curr) => 
                        Math.abs(curr.year - xValue) < Math.abs(prev.year - xValue) ? curr : prev
                    );
                    
                    tooltip.style("visibility", "visible")
                        .html(`Genre: ${genreData.genre}<br>` +
                              `Year: ${closestData.year}<br>` +
                              `Count: ${closestData.count}`);
                })
                .on("mousemove", (event) => {
                    tooltip.style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("visibility", "hidden");
                });
        });

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5));

        svg.append("g")
            .call(d3.axisLeft(y));
    }
    // Initialize slider last, after all functions are defined
    fetch('/api/years')
        .then(response => response.json())
        .then(yearRange => {
            const yearSlider = document.getElementById('year-slider');
            if (yearSlider && !yearSlider.noUiSlider) {
                noUiSlider.create(yearSlider, {
                    start: [yearRange.minYear, yearRange.maxYear],
                    connect: true,
                    step: 1,
                    range: {
                        'min': yearRange.minYear,
                        'max': yearRange.maxYear
                    }
                });

                yearSlider.noUiSlider.on('update', function(values) {
                    const minYear = Math.round(Number(values[0]));
                    const maxYear = Math.round(Number(values[1]));
                    document.getElementById('year-label').textContent = `Year: ${minYear} - ${maxYear}`;
                    updateVisualization(minYear, maxYear);
                });

                // Initial visualization
                updateVisualization(yearRange.minYear, yearRange.maxYear);
            }
        })
        .catch(error => console.error('Error fetching year range:', error));
});
