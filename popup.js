
var context_widgets = {

    current_view: "#widget_view",

    get_domain: function (url) {
        return url.replace('http://','').replace('https://','').split("/")[0]; ///[/?#]/)[0];
    },

    transit_view: function (next) {
        if (context_widgets.current_view === next) return;
        
        $(next).css({"z-index": -1})
        $(next).show();
        var opts = {};
        var prev = context_widgets.current_view;
        $(context_widgets.current_view).effect("fade", opts, 200, function() {
            $(prev).hide();
            $(next).css({"z-index": 0});
        });
        context_widgets.current_view = next;
    },

    get_uuid: function() {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        }   
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
    },

    add_widget: function(store, key, new_widget, callback) {
        store.get('widgets', function(o) {
            var keys = [];
            if ('widgets' in o) {
                keys = o.widgets;
            }
            keys.push(key);
            store.set({widgets: keys}, function() {
                
                var update = {};
                update[key] = new_widget;
                store.set(update, function() {
                    callback();
                });
            });
        });
    },

    add_link: function() {
        //chrome.tabs.getCurrent(function (tab) {
        chrome.tabs.query({"active": true}, function (tabs) {
            var tab = tabs[0];
            var url = tab.url;
            var title = tab.title;
            var domain = context_widgets.get_domain(url);

            $('#cond_field')[0].value = domain;
            $('#link_field')[0].value = url;
            $('#title_field')[0].value = title;
            $("#add").button().click(function (ev) {
                ev.preventDefault();
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
                    context_widgets.add_widget(chrome.storage.sync, key, new_widget, function() {
                        context_widgets.show_widgets();
                    });                
                } catch(err) {
                    console.log(err);
                    throw err;
                }
            });
            context_widgets.transit_view("#add_link_form");
        });
    },

    render_html: function(widget) {
        return '<span class="ui-icon ui-icon-bookmark" style="float:left; margin-left:10px; margin-right:10px;"></span> <a href="' + widget.link_href + '" class="widget_link">' + widget.title + '</a>'
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
                chrome.storage.sync.remove(delkey, function() { 
                    callback();
                });
            });
        });
    },

    open_link: function(url) {
        chrome.tabs.query({"active": true}, function (tabs) {
            var tab = tabs[0];
            chrome.tabs.update(tab.id, {url: url}, function () {
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
                    var html = '';
                    for (var i = 0; i < keys.length; ++ i) {
                        var widget = o2[keys[i]];
                        if (! context_widgets.check_condition(tab,widget)) 
                            continue;
                        html += '<li class="ui-state-default">';
                        html += context_widgets.render_html(widget);
                        html += '<a href="" class="widget_delete_button" data-widget-id="' + widget.uuid + '"></a>';
                        html += "</li>";
                    }
                    $("#widget_list").html(html + '');

                    context_widgets.transit_view("#widget_view");

                    $(".widget_link").click(function(ev) {
                        ev.preventDefault();
                        console.log(this.href);
                        context_widgets.open_link(this.href);
                    });

                    $(".widget_delete_button")
                        .button({class: "delete_button", 
                                 text: false,
                                 icons: {primary: "ui-icon-close"}})
                        .click(function (ev) {
                            ev.preventDefault();
                            //alert($(this).data("widgetId"));
                            var wid = $(this).data("widgetId");
                            context_widgets.delete_widget(wid, function() {
                                context_widgets.show_widgets();
                            });
                        });
                    
                    $("#widget_list").sortable();
                    $("#widget_list").disableSelection();
                    $("#add_link").button().click(function (ev) {
                        ev.preventDefault();
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
