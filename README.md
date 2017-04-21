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
      cityAndMascot:"Minnesota Vikings",
      teamDescription:"The Minnesota Vikings are an American football team based in Minneapolis, Minnesota. The Vikings joined the National Football League as an expansion team in 1960, and first took the field for the 1961 season."
    });
    
    
    var view = new TeamView({
        model:team
    });
    

The problem here is that the variables `cityAndMascot` and `teamDescription` are embedded directly into the view's template, so `TeamView` needs its model to be an instance of `Team`. A better, more portable approach is to make the view's template unreliant upon a particular model, like this:

    Team = Backbone.Model.extend({});
    HeaderParagraphView = Backbone.View.extend({
        template:`
            <h1> </h1>
            <p> </p>   
        `
    });
    
    var team = new Team({
      cityAndMascot:"Minnesota Vikings",
      teamDescription:"The Minnesota Vikings are an American football team based in Minneapolis, Minnesota. The Vikings joined the National Football League as an expansion team in 1960, and first took the field for the 1961 season."
    });
    
    
    var view = new HeaderParagraphView({
        model:team
    });
    
    //application code
    view.listenTo(team,"set:cityAndMascot",function(){this.$el.find("h1").html(this.model.get("cityAndMascot"))})
    view.listenTo(team,"set:teamDescription",function(){this.$el.find("h1").html(this.model.get("teamDescription"))})

Now `HeaderParagraphView` is not married to `Team` with its template variables. Theoretically, you could re-use `HeaderParagraphView` in another application with a completely different model. Underneath `//application code`, you see all of the code that is necessary to make the app run. When you start to make a lot more views in this manner, you realize there is a lot of boilerplate code with this approach. 


## Vision

The vision behind Fajita is to provide an efficent way to link a deep view and a deep model, and have the view automatically update when changes to the model occur. 

We want to improve on this by 

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
