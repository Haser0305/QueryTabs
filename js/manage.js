let tab_list = [];
let keys;  //useless
let update_list = [];
let settings = {
    remove: true,
    accordion: true,
    accordion_active: true
}

let refresh_settings = [
    "accordion",
    "accordion_active"
]
let open_windowId_incognito;
let open_windowId;
let latest_version = 2.0;
let managePageID = 0;

let debug = false;

let user_data = {
    settings: settings,
    tabs: [],
    version: latest_version
};


function DataVersionCheck(data) {
    //todo finished this function
    if (data.version !== latest_version) {
        user_data['settings'] = data['settings'];
        user_data['tabs'] = data['tabs'];
    } else {
        console.log('latest data version.');
    }
}

function UpdateBackUp() {
    chrome.storage.local.get(null, (response) => {
        chrome.storage.local.set({
            backup: {
                data: response,
                time_day: Math.ceil(Date.now() / 86400000)
            }
        })
    })
}

function SetDialog(title, message) {
    let $dialog = $("#update-description").dialog({
        title: title,
        width: 650
    });
    $dialog.dialog("open");

    $dialog.html(message);
}

function AddEvent() {

    // event after editing group name.
    $("div[contenteditable]").focusout((data) => {
        update_list.push($(data.target).parents(".time-div")[0].id)
        UpdateGroup("tab");
    })

    $("img.delete-icon").on("click", (click_event) => {

        DeleteData(click_event);
    })

    $("button.open-btn").on("click", (click_event) => {
        // OpenTabs($(click_event.target).parents(".time-div")[0].id);
        OpenTabsNew($(click_event.target).parents(".time-div")[0].id);
    })

    $('button').click((e) => {
        e.stopPropagation();
    })

    $("button.delete-group-btn").on("click", (click_event) => {
        // console.log(click_event);
        let delete_group_confirm = confirm("Are you sure you want to delete this group?");
        if (delete_group_confirm) {
            DeleteGroup($(click_event.target).parents(".time-div")[0].id);
        }
    })

    $("a").on("click", (click_event) => {

        //TODO deal how to create a normal window in incognito window. and create some variables to store windowID.

        let target = click_event.target;
        let window_id;
        let bool_incognito = !!target.className;

        console.log(bool_incognito)

        if (bool_incognito) {

            if (open_windowId_incognito) {

                chrome.windows.create({
                    url: target.href
                }, (window1) => {
                })

            } else {
                chrome.windows.create({
                    url: target.href,
                    incognito: true
                }, (window1) => {
                    console.log(window1);
                })
            }

        } else {

            chrome.windows.create({
                url: target.href
            }, (window_id) => {
            })
        }
        return false;
    })

    $(".setting-item").change((handle) => {
        settings[handle.target.name] = handle.target.checked;
        console.log(settings);

        if (settings.accordion_active) {
            $('#group-accordion-default-check').attr('disabled', 'disabled');
        } else {
            $('#group-accordion-default-check').removeAttr('disabled');
        }

        if (debug) {
            sessionStorage.temp_data = JSON.stringify({
                settings: settings,
                tabs: tab_list,
                version: 1
            });
            location.reload();
        } else {
            chrome.storage.local.set({settings: settings}, () => {
                chrome.runtime.sendMessage({target: "update settings"})
                if (refresh_settings.find(value => value === handle.target.name)) {
                    location.reload();
                }
            })
        }
    })

    let $group_input = $(".group-input");

    // prevent space key to collapse the accordion.
    $group_input.keydown((e) => {
        e.stopPropagation();
    })
    // event clicking the group name space will collapse or expand the accordion.
    $group_input.click((e) => {
        e.stopPropagation();
    })

}

function AddHover() {
    $(".tab-row").hover(function () {
        let delete_icon = $(this).find(".delete-icon")[0];
        let img = $(this).find("img")[0];

        $(delete_icon).toggle();

    }, function () {
        let icon = $(this).find(".delete-icon")[0];
        icon.style.display = "none";
    });
}

function CreateGroups(data) {
    let temp_data = JSON.stringify(data);
    temp_data = JSON.parse(temp_data);
    let $tabs = $("#content");

    for (let group of temp_data) {
        // console.log(group);
        let row_elements = []; // This array for web data.

        group.data.forEach((element) => {
            let tab_row;
            if (element.incognito) {
                tab_row = $("<div class='tab-row row-incognito'>").append(
                    $("<img class='delete-icon' src='../../cross-solid.png' alt='Delete'>"),
                    $("<img class='url-icon' src='' alt='url-icon'>").attr("src", element.favIconUrl),
                    $("<a class='a-incognito'>").attr("href", element.url).html(element.title)
                );
            } else {
                tab_row = $("<div class='tab-row'>").append(
                    $("<img class='delete-icon' src='../../cross-solid.png' alt='Delete'>"),
                    $("<img class='url-icon' src='' alt='url-icon'>").attr("src", element.favIconUrl),
                    $("<a>").attr("href", element.url).html(element.title)
                );
            }
            row_elements.push(tab_row);
        })


        let append_list = [];

        append_list.push(
            $("<div class='time-div'>").attr("id", group.id).append(
                $("<div class='group-info'>").append(
                    $("<div class='group-row'>").append(
                        $("<div class='group-input' contenteditable='true'>").text(group.group_name),
                        // $("<p class='div-name'>").html(tab_list[key].time)
                        $("<div class='div-name'>").append(
                            $("<h2 class='h2-name'>").html(group.time)
                        )
                    ),
                    $("<div class='group-row'>").append(
                        $("<div class='feather-div'>").append(
                            $("<button type='button' class='open-btn'>").html("開啟群組"),
                            $("<button type='button' class='delete-group-btn'>").html("刪除群組")
                        )
                    )
                ),
                $("<div class='div-content'>").append(
                    $("<div class='tabs-div Sortable'>").append(row_elements)
                )
            )
        )

        $tabs.append(append_list);
    }


    // page elements can drag and sort.
    $(".Sortable").sortable({
        connectWith: ".Sortable",
        items: "> div.tab-row",
        appendTo: $tabs,
        helper: "clone",
        zIndex: 999990,
        start: function () {
            $tabs.addClass("dragging");
            update_list.push($(this).parents(".time-div")[0].id);
        },
        stop: function (event, ui) {
            $tabs.removeClass("dragging");
            update_list.push($(ui.item[0]).parents(".time-div")[0].id);
            setTimeout(() => {
                UpdateGroup("tab");
            }, 200);
        }
    }).disableSelection();

    $tabs.sortable({
        items: "> div.time-div",
        axis: "y",
        handle: ".div-name",
        stop: (() => {
            UpdateGroup("group");
        })
    });
    if (settings.accordion) {
        $(".time-div")
            .accordion({
                header: "div.group-info",
                collapsible: true,
                heightStyle: "content",
                active: settings.accordion_active ? 0 : true,
                icons: false,
                create: (() => {
                    // show all accordion
                    // $(".ui-accordion-content").show();
                    // $(".ui-accordion-content").focus();
                    // $(".ui-accordion-content").click();
                })
            })
    } else if (settings.accordion_active_default) {
        for (let group of temp_data) {
            if (group.accordion) {
                $(`#${group.id}`).accordion('option', 'active', 0);
            }
        }
    }
}

/**
 * @deprecated
 */
function OpenTabs(group_id) {

    let group = tab_list.find(element => element.id == group_id);
    if (!group) {
        console.log('error id.');
        return;
    }

    let tabs = group.data;

    let window_id;
    let window_incognito_id;
    let windows = {}
    let window_type;
    let data_id = 0;
    let tabs_normal = [];
    let tabs_incognito = [];

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].incognito) {
            tabs_incognito.push(tabs[i].url);
        } else {
            tabs_normal.push(tabs[i].url);
        }
    }

    let focus = true;
    if (tabs_incognito.length) {
        focus = false;
    }


    let interval = setInterval(() => {
        if (tabs[data_id].incognito) {
            window_type = 'incognito';
        } else {
            window_type = 'normal';
        }
        console.log('windows id: ', windows[window_type]);

        if (!windows[window_type]) {
            chrome.windows.create({
                url: tabs[data_id].url,
                incognito: tabs[data_id].incognito
            }, (window) => {
                console.log(window);
                windows[window_type] = window.id;
                console.log(windows[window_type]);
                chrome.windows.update(managePageID, {'focused': true});
            })
        } else {
            chrome.tabs.create({
                url: tabs[data_id].url,
                windowId: windows[window_type]
            })
        }

        data_id += 1;
        if (data_id === tabs.length) {
            clearInterval(interval);
        }
    }, 50)
}

async function Sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}

async function OpenTabsNew(group_id) {
    let group = tab_list.find(elem => elem.id == group_id);
    if (!group) {
        console.log('no tabs in this id.');
        return;
    }

    let windows_id = {};
    let window_top = Math.ceil(window.screen.availHeight * 0.1);
    let window_left = Math.ceil(window.screen.availWidth * 0.05);

    let get_id;
    for (let tab of group.data) {
        let window_type;
        if (tab.incognito) {
            window_type = "incognito";
        } else {
            window_type = "default";
        }

        if (windows_id[window_type]) {
            chrome.tabs.create({
                url: tab.url,
                windowId: windows_id[window_type],
                active: false
            }, () => {
                console.log('create by tabs create');
            })
        } else {
            get_id = false;
            chrome.windows.create({
                url: tab.url,
                incognito: tab.incognito,
                top: window_top,
                left: window_left
            }, (window) => {
                windows_id[window_type] = window.id;
                window_left *= 4;
                window_top += 80;
                get_id = true;
                chrome.windows.update(managePageID, {'focused': true});
            })
        }

        while (!get_id) {
            await Sleep(100);
        }
    }


}

function UpdateTabListById(id, updateData) {
    // id = parseInt(id);
    for (let i = 0; i < tab_list.length; i++) {
        if (tab_list[i].id == id) {
            tab_list[i].data = updateData.data;
            tab_list[i].group_name = updateData.group_name;
        }
    }
}

function UpdateGroup(type) {

    if (type === "tab") {
        let id;
        while (id = update_list.pop()) {
            let div = $("#" + id)[0];
            let group_name = $(div).find(".group-input")[0].innerHTML;
            let tab_rows = $(div).find(".tab-row");

            if (!tab_rows.length) {
                DeleteGroup(id);
                return;
            }

            let updateData = {}
            updateData["group_name"] = group_name;
            updateData["data"] = [];

            for (let j = 0; j < tab_rows.length; j++) {
                updateData["data"].push({
                    favIconUrl: $(tab_rows[j]).find(".url-icon")[0].src,
                    title: $(tab_rows[j]).find("a")[0].text,
                    url: $(tab_rows[j]).find("a")[0].href,
                    incognito: !!$(tab_rows[j]).find("a")[0].className
                })
            }

            UpdateTabListById(id, updateData);
            console.log("Update data: ", tab_list);
        }
    } else if (type === "group") {
        //todo change method to update group more efficient.
        let new_list_id = [];
        let new_list = [];
        $(".time-div").each((index, element) => {
            new_list_id.push(element.id);
        })

        for (let id_temp of new_list_id) {
            new_list.push(tab_list.find(element => element.id == id_temp));
        }
        tab_list = new_list;
    }


    if (debug) {
        sessionStorage.temp_data = JSON.stringify({
            settings: settings,
            tabs: tab_list,
            version: latest_version
        });
    } else {

        UpdateToChrome();
    }

}

function DeleteData(button) {
    button = button.target
    let row = $(button).parents('div')[0];
    update_list.push($(button).parents(".time-div")[0].id);
    $(row).remove();
    UpdateGroup("tab");
}

function DeleteGroup(group_id) {
    // console.log("delete group ", group_id);

    let div = $("#" + group_id)[0];

    $(div).remove();


    let index = tab_list.findIndex(element => element.id == group_id);
    tab_list.splice(index, 1);

    UpdateToChrome();

}

function UpdateToChrome() {
    chrome.storage.local.set({tabs: tab_list}, () => {
        chrome.runtime.sendMessage({target: 'update list'})
    })
}

// Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message);
    if (message.target === 'refresh') {
        sendResponse('ok');
        window.location.reload();
    } else if (message.target === 'show dialog') {
        SetDialog(message.title, message.message);
    }
})

$(function () {

    let parameters = new URLSearchParams(window.location.search);
    if (!debug) {
        debug = parameters.get('debug');
    }

    if (debug) {
        //todo fix this function.
        console.log("It's debug mode now.");

        if (!sessionStorage.temp_data) {
            sessionStorage.temp_data = JSON.stringify(temp_data_new_version);
        }

        let total_data = JSON.parse(sessionStorage.temp_data);
        DataVersionCheck(total_data);
        tab_list = total_data.tabs;
        //initialed settings
        settings = total_data.settings;
        $("#remove-check")[0].checked = settings.remove;
        $("#accordion-check")[0].checked = settings.accordion;
        $("#accordion-active-check")[0].checked = settings.accordion_active;


        CreateGroups(tab_list);
        AddHover();

        // prevent enter key in the div
        $('div[contenteditable]').keydown(function (e) {
            // trap the return key being pressed
            if (e.keyCode === 13) {
                // insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
                // document.execCommand('insertHTML', false, '<br/>');
                // prevent the default behaviour of return key pressed
                // console.log(($(this).parents("time-div")));
                $(this).blur();
                return false;
            }
        });
        AddEvent();
    } else {
        chrome.windows.getCurrent((window) => {
            managePageID = window.id;
        });
        chrome.storage.local.get(['version', 'tabs', 'settings'], (response) => {
            console.log(response);
            if (Object.keys(response).length === 0 || Object.keys(response.settings).length === 0) {
                console.log('send init request.');
                chrome.runtime.sendMessage({target: 'init profile'});
            }
            chrome.runtime.sendMessage({target: 'init profile'}, response => {
                console.log(response);
                if (response) {
                    tab_list = response.tabs;

                    if (!tab_list) {
                        return;
                    }
                    //initialed settings
                    settings = response.settings;
                    $("#remove-check")[0].checked = settings.remove;
                    $("#accordion-check")[0].checked = settings.accordion;
                    $("#accordion-active-check")[0].checked = settings.accordion_active;
                    $("#group-accordion-default-check")[0].checked = settings.accordion_active_default;
                    if (!settings.accordion_active) {
                        $('#group-accordion-default-check').removeAttr('disabled');
                    }
                    CreateGroups(tab_list);
                    AddHover();
                    // prevent enter key in the div where group name.
                    $('div[contenteditable]').keydown(function (e) {
                        // trap the return key being pressed
                        if (e.keyCode === 13) {
                            // insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
                            // document.execCommand('insertHTML', false, '<br/>');
                            // prevent the default behaviour of return key pressed
                            // console.log(($(this).parents("time-div")));
                            $(this).blur();
                            return false;
                        }
                    });
                    AddEvent();
                }
            })
        })
    }
})
