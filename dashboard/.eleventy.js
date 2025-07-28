import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { DateTime } from "luxon";

export default function(eleventyConfig) {
  // Add plugins
  eleventyConfig.addPlugin(syntaxHighlight);

  // Copy static files
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/css");
  
  // Add filters
  eleventyConfig.addFilter("dateFormat", (date, format = "yyyy-MM-dd") => {
    if (!date) return "";
    return DateTime.fromJSDate(new Date(date)).toFormat(format);
  });

  eleventyConfig.addFilter("limit", (arr, limit) => {
    return arr.slice(0, limit);
  });

  eleventyConfig.addFilter("sortBy", (arr, prop) => {
    return [...arr].sort((a, b) => {
      if (a[prop] < b[prop]) return -1;
      if (a[prop] > b[prop]) return 1;
      return 0;
    });
  });

  eleventyConfig.addFilter("reverse", (arr) => {
    return [...arr].reverse();
  });

  eleventyConfig.addFilter("groupBy", (arr, prop) => {
    return arr.reduce((groups, item) => {
      const group = item[prop];
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  });

  // Add shortcodes
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  
  eleventyConfig.addShortcode("chartJs", (type, data, options = "{}") => {
    const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
    return `
      <canvas id="${chartId}" class="w-full h-64"></canvas>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const ctx = document.getElementById('${chartId}');
          new Chart(ctx, {
            type: '${type}',
            data: ${JSON.stringify(data)},
            options: {
              responsive: true,
              maintainAspectRatio: false,
              ...${options}
            }
          });
        });
      </script>
    `;
  });

  // Configure directories
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: [
      "md",
      "njk",
      "html",
      "liquid"
    ],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}