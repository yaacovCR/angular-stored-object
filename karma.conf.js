'use strict';

module.exports = function(config) {

  var configuration = {

    basePath: '',
    
    frameworks: ['jasmine'],
    
    files: [
      '+(bower_components|node_modules)/angular/angular.js',
      '+(bower_components|node_modules)/angular-mocks/angular-mocks.js',
      'src/**/*.js'
    ],
        
    singleRun: true,

    autoWatch: false,

    logLevel: 'INFO',
        
    browsers : ['PhantomJS', 'Chrome', 'Firefox'],

    plugins : [
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-coverage',
      'karma-jasmine',
    ],

    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    },

    reporters: ['progress', 'coverage'],
    
    preprocessors: {
      'src/**/*.js': ['coverage']
    }

  };

  if(process.env.TRAVIS) {
    configuration.customLaunchers = {
      'chrome-travis-ci': {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    };
    configuration.browsers = ['chrome-travis-ci'];
  }

  config.set(configuration);
};