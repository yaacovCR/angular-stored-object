'use strict';

var gulp = require('gulp');
var gulpDocs = require('gulp-ngdocs');
var options = {
  startPage: '/api/yaacovCR.storedObject',
  title: "angular-stored-object",
  titleLink: "/api/yaacovCR.storedObject",
  styles: [ 'ngdoc_assets/styles.css' ],
  navTemplate: 'ngdoc_assets/navTemplate.html',
  scripts: [
    'node_modules/angular/angular.min.js',
    'node_modules/angular/angular.min.js.map',
    'node_modules/angular-animate/angular-animate.min.js',
    'node_modules/angular-animate/angular-animate.min.js.map',
    'node_modules/marked/lib/marked.js'    
  ]
};
  
gulp.task('default', function () {
  return gulp.src('src/*.js')
    .pipe(gulpDocs.process(options))
    .pipe(gulp.dest('./docs'));
});