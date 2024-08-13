import {LOCAL_USER} from "../../../common/tools/user";
import {ClientString} from "../../../common/tools/client_string";
import {PAGE_CONTEXT, permissions} from "../../../common/tools/utils";
import {spawn_context_action} from "../components/context_action";
import {edit_repos} from "../edit_repos/edit_repos_form";
import {parse_fetch_result} from "../components/message_box";

async function update_last_repos() {
    const repos_list = document.getElementById('last-repos-list')
    if (!repos_list)
        return;
    repos_list.innerHTML = '';
    const elements = await LOCAL_USER.get_last_repos();
    for (const repos of elements.reverse()) {
        const button = document.createElement('button');
        button.onclick = () => {
            window.location.href = `${window.origin}/${new ClientString(repos.username).encoded()}/${new ClientString(repos.name).encoded()}`;
        }
        if (PAGE_CONTEXT && PAGE_CONTEXT.display_repos && PAGE_CONTEXT.display_repos.id === repos.id)
            button.classList.add('selected-repos');
        button.innerText = new ClientString(repos.name).plain();
        button.oncontextmenu = (event) => {
            open_repos_context_menu(repos.id);
            event.preventDefault();
        }
        button.repos_id = repos.id;
        repos_list.append(button)
    }
}

update_last_repos();

for (const button of document.getElementsByClassName('repos-list-item')) {
    button.oncontextmenu = (event) => {
        open_repos_context_menu(button.getAttribute('repos_id'));
        event.preventDefault();
    }
}

async function open_repos_context_menu(repos_id) {
    const actions = [];
    actions.push({
        title: "Modifier",
        action: async () => {
            const repos_data = await parse_fetch_result(await fetch('/api/repos-data',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([repos_id])
                }));
            if (repos_data.length === 1) {
                repos_data[0].name = new ClientString(repos_data[0].name).plain();
                repos_data[0].description = new ClientString(repos_data[0].description).plain();
                repos_data[0].display_name = new ClientString(repos_data[0].display_name).plain();
                edit_repos(repos_data[0]);
            }
        },
        image: '/images/icons/icons8-edit-96.png'
    });
    spawn_context_action(actions);
}

window.file_list = {open_repos_context_menu}