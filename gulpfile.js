'use strict';

var gulp = require('gulp');

gulp.task('push', function () {
  var git = require('gulp-git');

  git.checkout('gh-pages', function (err) {
    if (err) throw err;
    git.merge('master', function (err) {
      if (err) throw err;
      git.push('origin', 'gh-pages', function(err) {
        if (err) throw err;
        git.checkout('master', function (err) {
          if (err) throw err;
        });
      });
    });
  });
  
});

gulp.task('default', function () {
  var ngdocs = require('gulp-ngdocs');
  var options = {
    startPage: '/api/yaacovCR.storedObject',
    title: "angular-stored-object",
    html5Mode: false,
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
  
  return gulp.src('src/*.js')
    .pipe(ngdocs.process(options))
    .pipe(gulp.dest('./docs'));
});