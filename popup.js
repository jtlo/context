

var context_widgets = {

    get_domain: function (url) {
        return url.replace('http://','').replace('https://','').split("/")[0]; ///[/?#]/)[0];
    },
    get_uuid: function() {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        }   
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
    },

    add_link: function() {
        //chrome.tabs.getCurrent(function (tab) {
        chrome.tabs.query({"active": true}, function (tabs) {
            var tab = tabs[0];
            var url = tab.url;
            var title = tab.title;
            var domain = context_widgets.get_domain(url);

            $("#content_area").html('<form><label for="cond">Condition:</label> <input type="text" name="cond" id="cond_field"/><br/> <label for="title">Title:</label> <input type="text" name="title" id="title_field"/>  <br/> <label for="link">URL:</label> <input type="text" name="link" id="link_field"/> <a href="" id="add">Add</a></form>');
            $('#cond_field')[0].value = domain;
            $('#link_field')[0].value = url;
            $('#title_field')[0].value = title;
            $("#add").button().click(function (ev) {
                var uuid = context_widgets.get_uuid();
                var new_widget = {
                    'uuid': uuid,
                    'type': 'link',
                    'title': $('#title_field')[0].value,
                    'condtype': 'url_re',
                    'condkey': $('#cond_field')[0].value,
                    'link_href': $('#link_field')[0].value
                };
                key = "widget_" + uuid;
                try {
                    var update = {};
                    update[key] = new_widget;
                    chrome.storage.sync.set(update, function() {
                        //alert("Widget saved");
                    } );
                    chrome.storage.sync.get('widgets', function(o) {
                        var keys = [];
                        if ('widgets' in o) keys = o['widgets'];
                        keys.push(key);
                        chrome.storage.sync.set({'widgets': keys}, function() {
                            //alert("Keys saved");
                        });
                        context_widgets.show_widgets();
                    });                
                } catch(err) {
                    alert(err);
                    throw err;
                }
            });
        });
    },

    render_html: function(widget) {
        return '<a href="' + widget.link_href + '">' + widget.title + '</a>'
    },

    check_condition: function(tab, widget) {
        var url = tab.url;
        //return true; // for debug
        if (url.search(widget.condkey) >= 0) return true;
        return false;
    },

    delete_widget: function(wid, callback) {
        var delkey = "widget_" + wid;
        chrome.storage.sync.get('widgets', function(o1) {
            var keys = []
            if ('widgets' in o1) keys = o1['widgets'];
            var newkeys = keys.filter(function(v, i) {
                var ret = (v !== delkey);
                return ret;
            });
            chrome.storage.sync.set({'widgets': newkeys}, function() {
                chrome.storage.sync.remove(delkey, function() { });
                callback();
            });
        });
    },

    show_widgets: function() {
        chrome.tabs.query({"active": true}, function (tabs) {
            var tab = tabs[0];
            chrome.storage.sync.get('widgets', function(o1) {
                var keys = []
                if ('widgets' in o1) keys = o1['widgets'];
                chrome.storage.sync.get(keys, function (o2) {
                    var html = '<ul id="widgets_list">';
                    for (var i = 0; i < keys.length; ++ i) {
                        var widget = o2[keys[i]];
                        if (! context_widgets.check_condition(tab,widget)) 
                            continue;
                        html += '<li class="ui-state-default">' + context_widgets.render_html(widget);
                        html += '<a href="" class="widget_delete_button" data-widget-id="' + widget.uuid + '"></a>';
                        html += "</li>";
                    }
                    html += "</ul>"
                    $("#content_area").html(html + '<a id="add_link">Add Link</a>');
                    $(".widget_delete_button")
                        .button({class: "delete_button", 
                                 text: false,
                                 icons: {primary: "ui-icon-close"}})
                        .click(function (ev) {
                            //alert($(this).data("widgetId"));
                            var wid = $(this).data("widgetId");
                            context_widgets.delete_widget(wid, function() {
                                context_widgets.show_widgets();
                            });
                        });
                    
                    $("#widgets_list").sortable();
                    $("#widgets_list").disableSelection();
                    $("#add_link").button().click(function (ev) {
                        context_widgets.add_link();
                    });
                });
            });
        });
    },
    
};

// Run our kitten generation script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () {
    context_widgets.show_widgets();
});
