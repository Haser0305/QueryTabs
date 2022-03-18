let block_urls = [
    'chrome://newtab/',
    'chrome://extensions/',
    'chrome-extension://'
];
let tab_list = {};
let remove_bool;
let latest_version = 2.0;


// events for click icon.
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.query({currentWindow: true}, (tabs) => {
        chrome.windows.getCurrent((window) => {
            add_list(tabs, window);
        })
    })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.target === 'update list') {
        chrome.storage.local.get(['tabs'], (response) => {
            tab_list = response.tabs;
        })
    } else if (message.target === 'update settings') {
        update_settings();
    } else if (message.target === 'init profile') {
        (async () => {
            let response = await check_profile();
            sendResponse(response);
        })();
    }
    return true;
})

chrome.runtime.onInstalled.addListener(async () => {
    console.log('Hello!');
    let response = await check_profile();

    if (response.tabs) {
        await chrome.storage.local.set({'backup': response.tabs});
        let new_tabs = [];
        for (let group of response.tabs) {
            let new_group = {
                id: -1,
                data: [],
                group_name: '',
                time: '',
                accordion: true
            };

            new_group['id'] = group['id'];
            new_group['group_name'] = group['group_name'];
            new_group['time'] = group['time'];

            for (let data of group['data']) {
                new_group['data'].push({
                    favIconUrl: data['icon'] ? data['icon'] : data['favIconUrl'],
                    incognito: data['incognito'],
                    title: data['title'],
                    url: data['url']
                })
            }
            new_tabs.push(new_group);
        }

        await chrome.storage.local.set({'tabs': new_tabs});

        console.log('transfer to new version.');
    }

})

chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command:', command);
    if (command === 'open-manage-page') {
        chrome.tabs.query({
            url: "chrome-extension://" + chrome.runtime.id + "/html/manage_page.html",
        }, (response) => {
            if (response[0]) {
                chrome.windows.update(response[0].windowId, {focused: true}, () => {
                    chrome.tabs.sendMessage(response[0].id, {target: "refresh"});
                });
            } else {
                chrome.windows.create({
                    url: "html/manage_page.html"
                });
            }
        })
    }
})

/**
 *
 * @param tabs a list for tabs
 * @param window
 */
function add_list(tabs, window) {
    if (!tabs) return;

    let date = new Date();

    let time = date.getTime();

    let time_string = date.getFullYear() + '年' +
        (date.getMonth() + 1) + '月' +
        date.getDate() + '日 ' +
        date.getHours() + ':' +
        date.getMinutes() + ':' +
        date.getSeconds();

    let tab_list_add = {
        id: time,
        group_name: '',
        time: time_string,
        data: [],
        accordion: false
    };

    // add tabs into list
    for (let tab of tabs) {
        if (tab.url in block_urls) continue;

        tab_list_add['data'].push({
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl ? tab.favIconUrl : '../icon/web icon.png',
            incognito: window.incognito
        });
    }

    console.log(tab_list_add);

    let manage_window_id;
    let tab_id;

    chrome.storage.local.get(['tabs'], (response) => {
        if (response.tabs) {
            tab_list = response.tabs;
        } else {
            tab_list = [];
        }

        if (remove_bool === undefined) {
            console.log('error, did not get settings!');
            return;
        }

        chrome.tabs.query({
            url: 'chrome-extension://' + chrome.runtime.id + '/html/manage_page.html'
        }, (tabs_response) => {
            // if the manage page is open, then get the window id and focus on it,
            // or create a new window and open management page.

            if (tabs_response[0]) {
                manage_window_id = tabs_response[0].windowId;
                tab_id = tabs_response[0].id;
            }

            if (tab_list_add.data[0]) {
                tab_list.unshift(tab_list_add);
                chrome.storage.local.set({
                    tabs: tab_list
                }, () => {
                    if (remove_bool) {
                        chrome.windows.remove(window.id);
                    }
                })
            } else {
                if (remove_bool) {
                    chrome.windows.remove(window.id);
                }
            }

            if (manage_window_id) {
                chrome.windows.update(manage_window_id, {focused: true}, () => {
                    chrome.tabs.sendMessage(tab_id, {target: 'refresh'});
                });
            } else {
                chrome.windows.create({
                    url: "html/manage_page.html"
                }, () => {
                })
            }

        })
    })
}


function update_settings() {
    console.log('update settings');
    chrome.storage.local.get(['settings'], (response) => {
        let settings = response.settings;
        if (!settings) {
            init_profile('settings');
        }
        try {
            remove_bool = settings.remove;
        } catch (e) {
            remove_bool = true;
        }

    })
}

function init_profile(profile_type) {
    console.log('initialize data');
    switch (profile_type) {
        case 'version':
            chrome.storage.local.set({version: latest_version});
            break;
        case 'settings':
            chrome.storage.local.set({
                settings: {
                    remove: true,
                    accordion: true,
                    accordion_active: true,
                    accordion_active_default: true
                }
            });
            break;
        case 'tabs':
            chrome.storage.local.set({tabs: []});
    }
}

async function check_profile() {
    return new Promise(resolve => {
        console.log('check data....');
        let profile_data = ['version', 'tabs', 'settings'];
        chrome.storage.local.get(profile_data, (response_data) => {
            console.log(response_data);
            for (let i of profile_data) {
                if (!(i in response_data)) {
                    console.log(i, ' has no data.');
                    init_profile(i);
                }
            }
            console.log('detected data exist.');
            resolve(response_data);
        })
    })
}


update_settings();
