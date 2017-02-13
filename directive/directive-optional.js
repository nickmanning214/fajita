import $ from "jquery";
import Directive from "./directive";

export default Directive.extend({
    name:"optional",
    childInit:function(){
        //this.result = this.view.mappings[this.val].call(this.view);
        //update at inc
        this.result = this.view.viewModel.get(this.val);
        this.listenTo(this.view.viewModel,"change",function(){
            this.result = this.view.mappings[this.val].call(this.view);
            this.render();
        });
    },
    build:function(){
        if (!this.result) $(this.el).hide()
        else $(this.el).css("display","");
    },
    render:function(){
        if (!this.result) $(this.el).hide()
        else $(this.el).css("display","");
    }
});
