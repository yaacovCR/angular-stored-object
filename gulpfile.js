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

gulp.task('clean', function() {
  var del = require('del');
  del.sync['docs/**'];
});

gulp.task('build', ['clean'], function () {
  var ngdocs = require('gulp-ngdocs');
  var options = {
    title: "angular-stored-object",
    html5Mode: false,
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

  return ngdocs.sections({
    api: {
      glob:['src/*.js', '!src/*.spec.js'],
      api: true,
      title: 'API Documentation'
    }
  }).pipe(ngdocs.process(options))
    .pipe(gulp.dest('./docs'));
});

gulp.task('default', function () {
  gulp.start('build');
});