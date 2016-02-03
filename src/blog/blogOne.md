
{{blogs.one.title}}
===

We almost always use $http inside a service, because services are where we deal with stuff that can be shared throughout the app (like data from an API). But usually when we get a response, a controller needs to know about it. So how do we get this asynchronous response back to the controller?

In this article, I'll go over a few patterns for handling $http responses using some of Angular's built in functionality.

#### The Problem

Let's say we're building an app about clogs. When a button is clicked, we want to make $http request to our API and update our view with the new clog information.

#### The typical method - .then()

The $http function returns a promise, which has a .then() method which will be called in the controller when a response comes back from our API. Like so:

```JavaScript
app.controller('DisplayController', function($scope, ClogsService){
  $scope.clogs = [];
  $scope.getClogs = () => {
    ClogsService.getClogs()
      .then( (response) => {
        ClogsService.clogs = response.data;
        $scope.clogs = ClogsService.clogs;
      });
  };
})

app.service('ClogsService', function($http){
  this.clogs = [];
  this.getClogs = () => $http.get(`${API}/clogs`);
});
```

Good enough. Our service makes the $http request, and our controller is able to both update $scope and store the information the ClogsService for access throughout the app. But there are some issues with this method. Ideally, all the data management would happen in the service, not the controller. We want to keep our controller skinny!

#### A (slightly) better way - $watch

In this approach, we put response handling in the service. The controller will $watch a function that returns Clogservice.clogs. This will be checked during the digest cycle, and when the result changes the controller will update the scope.

```JavaScript
app.controller('DisplayController', function($scope, ClogsService){
  var clogsWatcher = () => ClogsService.clogs
  $scope.clogs = [];
  $scope.$watch( clogsWatcher, (newClogs) => $scope.clogs = newClogs, true);
  $scope.getClogs = ClogsService.getClogs;
})

app.service('ClogsService', function($http){
  this.clogs = [];
  this.getClogs = () => {
    $http.get(`${API}/clogs`)
      .then((response) => {
        this.clogs = response.data;
      });
  };
});
```

This is an improvement. Our controller has a more declarative style - we just ask for clogs, and the service takes care of the details. There is the added benefit that *any* controller can watch the service and update it's scope on a change.

But this method has a problem. The function we're watching, ```clogsWatcher```, gets checked during every digest cycle. This happens A LOT! By watching it, we're effectively putting ClogService.clogs on the scope. Too many things on the scope kills performance in Angular, so we'd like to avoid this.

PS: The last argument in $watch, "true," tells watch to check whatever it is watching for equivalence, not just reference

#### Getting fancy - Event Emitters

Good news! Angular $scope has methods for a "publish/subscribe" pattern, i.e. event emitters. This can make our task much easier. When the service gets new clog data from our API, we broadcast a "got-clogs" event. The controller is listening for that event, and updates the scope when it hears it.

```JavaScript
app.controller('DisplayController', function($scope, ClogsService){
  $scope.clogs = [];
  $scope.getClogs = ClogsService.getClogs;
  $scope.$on('got-clogs', () => $scope.clogs = ClogsService.clogs);
})

app.service('ClogsService', function($http, $rootScope){
  this.clogs = [];
  this.getClogs = () => {
    $http.get(`${API}/clogs`)
      .then((response) => {
        this.clogs = response.data;
        $rootScope.$broadcast('got-clogs')
      });
  };
});
```

This seems to solve all of our problems. Our controller is nice and simple, there are no unnecessary items on the scope, and any other controller can listen to this event to respond to new clogs!

However, there are pitfalls that are easy to encounter with this method. It has to do with how event emitters work. Let's look at a simplified event emitting system:

```JavaScript
app.controller('DisplayController', function($scope, EventEmitter){
  EventEmitter.registerListener('something-happened', () => {
    // ...things to do when something happens. Dance?
  });
})

app.service('EventEmitter', function($http){
  this.events = {};
  this.registerListener = (eventName, callback) => {
    if ( !this.events[eventName] ) this.events[eventName] = [];
    this.events[eventName].push(callback)
  };
  this.emit = (eventName) => {
    if ( !this.events[eventName] ) return;
    this.events[eventName].forEach( callback => callback() );
  };
});
```

Nothing magical here. When you "listen" to an event you're just adding a function to an array of functions that are executed when the event is "emitted." With our clogs example, we're adding a function that updates the scope to a list of functions that are called when the "got-clogs" event is triggered.

If you're building an app where you have directives or controllers that are dynamically created and destroyed, listening functions that reference their scope are still in the array of callbacks and are still called on every event! Things gets messy real fast. If you're building a large app, your components must "stop listening" before they are destroyed. Aviv Ben-Yosef describes an excellent pattern for registering and unregistering listeners in [this article](http://www.codelord.net/2015/05/04/angularjs-notifying-about-changes-from-services-to-controllers/). I would definitely recommend it if you're going with a publish/subscribe pattern.

#### Wrapping up

So far we've explored a few ways of handling $http responses in a service using Angular's built in functionality. It's worth noting that Angular as a promises library, $q (which $http is based off of), that can also be used to manage these $http responses. But I'll have to save that for another day.

Know any other ways you like to handle this task? I'd love to hear about it! Shoot me an [email](mailto:mpr75@cornell.edu)!

*Want to check out and play with the code samples used in this article? Everything's posted on [GitHub](https://github.com/paulgoblin/handling-http), so check it out!*
