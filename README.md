# 🌮 Fajita
A custom extension of Backbone.js, providing deep models, directives, and other features.

## Problems that Fajita seeks to solve.

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
