const gulp = require("gulp");
const concat = require("gulp-concat");
const watch = require("gulp-watch");
const sourcemaps = require("gulp-sourcemaps");

gulp.task("build", () => {
  gulp.src("src/**/*.js")
    .pipe(sourcemaps.init())
    .pipe(concat("phina.glfilter.js"))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./build"));
});

gulp.task("watch", () => gulp.watch("src/**/*.js", ["build"]));

gulp.task("default", ["build", "watch"]);