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
    if (!arr || !Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  });

  eleventyConfig.addFilter("sortBy", (arr, prop) => {
    if (!arr || !Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => {
      if (a[prop] < b[prop]) return -1;
      if (a[prop] > b[prop]) return 1;
      return 0;
    });
  });

  eleventyConfig.addFilter("reverse", (arr) => {
    if (!arr || !Array.isArray(arr)) return [];
    return [...arr].reverse();
  });

  eleventyConfig.addFilter("groupBy", (arr, prop) => {
    if (!arr || !Array.isArray(arr)) return {};
    return arr.reduce((groups, item) => {
      const group = item[prop];
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  });

  eleventyConfig.addFilter("dump", (obj) => {
    return JSON.stringify(obj);
  });

  eleventyConfig.addFilter("default", (value, fallback) => {
    return value || fallback;
  });

  // Create a global collections object to make data available in templates
  eleventyConfig.addCollection("all", function(collectionApi) {
    return collectionApi.getAllSorted();
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

  // Don't ignore includes directory - it contains layouts

  // Data files in _data directory are automatically available

  // Configure directories
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_layouts",
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
};
