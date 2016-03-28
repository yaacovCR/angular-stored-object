# angular-stored-object

[![Build Status](https://travis-ci.org/yaacovCR/angular-stored-object.svg?branch=master)](https://travis-ci.org/yaacovCR/angular-stored-object)

Local resource support for Angular using HTML5 storage

Combines the best of [ngResource](https://docs.angularjs.org/api/ngResource/service/$resource), [ngStorage](https://github.com/gsklee/ngStorage) and [angular-local-storage](https://github.com/grevory/angular-local-storage) to give you access to local and session storage within Angular, but also provides a storage strategy that supports sharing sessionStorage data between multiple tabs via [transient](http://stackoverflow.com/questions/20325763/browser-sessionstorage-share-between-tabs) [localStorage](http://blog.guya.net/2015/06/12/sharing-sessionstorage-between-tabs-for-secure-multi-tab-authentication/) use.


Installation
============

Using NPM:

```
npm install --save angular-stored-object
```

Using Bower:

```
bower install --save angular-stored-object
```

API
===

The small API is [fully documented](http://yaacovcr.github.io/angular-stored-object/docs).

Example
=======

A session service consists of an object that when stored will be identified via the prefixed key 'session': 
```javascript
  angular
    .module('auth', ['yaacovCR.storedObject']);
    
  angular
    .module('auth')
    .factory('session', session);

  function session(StoredObject) {
    return new ycr$StoredObject('session');
  }
  ```
  
An auth service manipulates the properties of the session object and calls $create and $delete as needed to persist to/delete from storage. $update, not shown, can be used when the token needs to be refreshed.
```javascript
  angular
    .module('glass.auth')
    .factory('auth', auth);

  function auth($http, $state, backendURI, session) {
    
    var _redirectToState = null;
    var _redirectToParams = null;
    
    return {
      login: login,
      isLoggedIn: isLoggedIn,
      logout: logout,
      registerRedirect: registerRedirect,
      followRedirect: followRedirect
    };
    
    function login(credentials) {
      return $http.post(backendURI + '/login', { credentials: credentials }).then(function(result) {
        session.token = result.data.token;
        session.loggedInUser = result.data.user;
        session.$create('sessionStorageWithMultiTabSupport');
      });
    }
    
    function isLoggedIn() {
      return !!session.token;
    }
    
    function logout() {
      session.$delete();
      $state.transitionTo('login');
    }
    
    function registerRedirect(toState, toParams) {
      _redirectToState = toState;
      _redirectToParams = toParams;
    }
    
    function followRedirect() {
      if (_redirectToState) {
        $state.transitionTo(_redirectToState, _redirectToParams);
        _redirectToState = _redirectToParams = null;
      } else {
        $state.transitionTo('home');
      }      
    }
```

For completion, the run block:
```javascript
  angular
    .module('glass')
    .run(runBlock);

  function runBlock($rootScope, $state, $timeout, auth) {
    $rootScope.$on('$stateChangeStart', onStateChangeStart);
    $rootScope.$on('storedObject:session:externalChange', onSessionChange);
    
    function onStateChangeStart(event, toState, toParams) {
      if (toState.name === 'login' && auth.isLoggedIn()) {
        event.preventDefault();
        auth.followRedirect();
      }
      if (toState.data && toState.data.authenticate && !auth.isLoggedIn()) {
        event.preventDefault();
        auth.registerRedirect(toState, toParams);
        $state.transitionTo('login');
      }
    }
        
    function onSessionChange() {
      $timeout(function() {
        $state.reload();
      });
    }

  }
```

And the routes:
```javascript
  angular
    .module('glass')
    .config(routerConfig);

  function routerConfig($stateProvider, $urlRouterProvider) {

    $stateProvider

      .state('home', {
        url: '/',
        templateUrl: 'app/main/main.html',
        controller: 'MainController',
        controllerAs: 'main',
        data: {
          authenticate: true
        }
      })

      .state("login", {
        templateUrl: "app/components/login/login.route.html"
      });
    
    $urlRouterProvider.otherwise('/');
  }
```
