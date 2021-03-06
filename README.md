# 🌮 Fajita
A custom extension of Backbone.js, providing deep models, directives, and other features.

## Problems that Fajita seeks to solve.

### The problematic "render" function in views

The simplest and most common pattern for view management in backbone applications is to render a template every time a model changes using `this.$el.html(this.template(this.model.attributes))`. This is approach has a few problems:

* Inefficient to render large templates
* Events on the elements in the template are lost when the template is rerendered
* References to elements inside of the template are lost when the template is rerendered
* Subviews have to be rebuilt when a parent view is rerendered


The solution, which is implemented by modern frameworks today, is to use directives which use Javascript to programatically manipulate the DOM. 


### Portability of View classes 

Views are not portable when their template contains model attributes. For example, if a view's template looks like:

    `<h1> <%= actor_name %> </h1>`

then it is not modular because you can't take this view and apply it to something other than an actor. An ideal modular view has variable names that don't have model property names embedded into it. A good view would be:

    Backbone.View.extend({
        template:`<h1> <%= header_content %> </h1>`,
        events:{
            "h1 click":function(){
                //some sort of animation or something
            }
        }
    });
    
This view is modular because any model could go to it. Fajita solves this problem by offering a way to hook a model into a view in a more portable way.

Fajita views have the portability of custom HTML elements, but without a new and obscure HTML syntax.

### Management of Sub Views    

While we want views to be portable, we also want them to be pluggable into other views. Fajita seeks to build a mechanism to include a view inside another view. 

### Sub Models vs Flat Models (a compromise)

Backbone applications are intended to work with a server, so it is convenient to keep models flat, since SQL tables are also flat and are joined by IDs. However, in front-end applications, treating your application like you are managing rows in a table is both inefficient and doesn't feel right. Adding structure to objects is a much more front-end way of doing things. 

### Control flow inside of templates

We are of the belief that templates should be "logicless" and we don't think there needs to be any compromise. Generally if you are using an `if` statement inside of a template, you are describing a behavior that can be symmantically explained in a directive. 

For example, the pattern:

    <% if (showElement) { %>
        <div>Show this element!</div>
    <% } %>
    
Can be rewritten to be:
     
     <div optional="showElement">Show this element!</div>
     
It is up to the Fajita library to support the "optional" directive. This is a better, more symmantic name than angular's `ngIf` because `if` is a vague statement that could mean anything. `optional` clearly conveys the purpose of the directive, that means the element is optionally shown based on a value. 

### Mixing javascript and HTML

Frameworks like React are known for the controversial practice of mixing Javascript and HTML. Angular allows for generic javascript to be placed inside of directives. We believe in the practice of separating Javascript and HTML. Therefore, the only values allowed in directives are variable names. Any kind of code needs to be placed in the code for the directive. 

### Forcing views to have a wrapper element

Backbone views are based on the idea that a view has one single `el` and `$el`. It also allows you to build this wrapper element with `tagName`, `id`, `className`, and `attributes`. This is an unnecessary restriction which effects your HTML code. HTML code should ideally be completely free form and symantic, so to force wrapper elements due to javascript philosophy is not in the spirit of good HTML code.

Instead each Fajita instance automatically has a dummy text node assigned to it, so that it can be anchored in a parent template. Then it has an array of nodes making up the DOM of the view.

## Philosophy

In Fajita, a View is thought of as a wrapper for a template, and a template is an HTML structure with embedded behaviors (directives).
    
# Old

### Model variables inside of view templates

Often you see something like this in Backbone applications:

    Team = Backbone.Model.extend({});
    TeamView = Backbone.View.extend({
        template:`
            <h1> <%= cityAndMascot %></h1>
            <p> <%= teamDescription %> </p>   
        `
    });
    
    var team = new Team({
      cityAndMascot:"San Diego Chargers",
      teamDescription:"The Chargers compete in the National Football League (NFL) as a member club of the league's American Football Conference (AFC) West division. The club began play in 1960 as a charter member of the American Football League (AFL), and spent its first season in Los Angeles, before moving to San Diego in 1961 to become the San Diego Chargers."
    });
    
    
    var view = new TeamView({
        model:team
    });
    

The problem here is that the variables `cityAndMascot` and `teamDescription` are embedded directly into the view's template, so `TeamView` needs its model to be an instance of `Team`. A better, more portable approach is to make the view's template unreliant upon a particular model, like this:

    Team = Backbone.Model.extend({});
    HeaderParagraphView = Backbone.View.extend({
        template:`
            <h1> <%= header_content %> </h1>
            <p> <%= paragraph_content %> </p>   
        `
    });
    
    var team = new Team({
      cityAndMascot:"San Diego Chargers",
      teamDescription:"The Chargers compete in the National Football League (NFL) as a member club of the league's American Football Conference (AFC) West division. The club began play in 1960 as a charter member of the American Football League (AFL), and spent its first season in Los Angeles, before moving to San Diego in 1961 to become the San Diego Chargers."
    });
    
    
    var view = new HeaderParagraphView({
        model:team
    });
    
    var viewModel = new Backbone.Model({
        header_content:team.get("cityAndMascot"),
        paragraph_content:team.get("teamDescription")
    });
    
    //application code
    view.listenTo(viewModel,"set",function(){this.render()})
    viewModel.listenTo(team,"set:cityAndMascot",function(){this.set("header_content",team.get("cityAndMascot"))});      
    viewModel.listenTo(team,"set:teamDescription",function(){this.set("paragraph_content",team.get("teamDescription"))})


Now `HeaderParagraphView` is not married to `Team` with its template variables. Theoretically, you could re-use `HeaderParagraphView` in another application with a completely different model. 

### Boilerplate

In Fajita Views, you don't need to explicitly make a seperate viewModel. A viewModel is instantiated automatically inside the constructor of Fajita.View. This viewModel is supposed to be like a private variable. You can get a property from the viewModel with `Fajita.View:get`, and you can set a property on the viewModel with `Fajita.View:set`.

Furthermore, all of that code under `//application code` is not necessary. The view automatically listens to the viewModel and renders the template when the viewModel changes. 

Passing a model in is optional. If you have no model, you can change the viewModel explicitly with `viewModel.set`. The initial values of the viewModel are equal to a `defaults` hash in the constructor.

If you pass a model in, you can also map model properties to viewModel properties using a `templateVariables` hash. 




## Fajita.Model

Thinking ahead, we will want to support deep models so that when a submodel updates, it will trigger an update event on the parent model. 
Thus, 

`Fajita.Model` is a `Backbone.Model` that is built for having application structure. 
There is no built-in way to provide nested model structure with `Backbone.Model`.
Providing this kind of functionality is left as an exercise for the developer.
The reason for this is because one valid pattern of organizing models is join them by id's. 
This approach makes it easier to maintain a flat model which is easy to save and load models to/from a SQL database.

Symantically speaking, it doesn't seem right to treat models as flat just because that's logistically how it would work on the backend.
Then again, managing a deep model would be difficult to maintain when saving and loading across a server to a SQL database.

Fajita.Model is a simple solution to this problem. The structure of models is maintained in the model by reference (not by relationships or joins). 
However it is done without interfering with a flat attributes object that can be easily loaded and saved.


## Fajita.Collection

Fajita.Collection
