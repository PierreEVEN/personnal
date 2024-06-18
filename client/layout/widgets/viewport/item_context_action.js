import {spawn_context_action} from "../../../common/widgets/context_action.js";
import {close_modal, open_modal} from "../../../common/widgets/modal.js";
import {parse_fetch_result, print_message} from "../../../common/widgets/message_box.js";
import {REPOS_BUILDER} from "./repos_builder";
import {PAGE_CONTEXT, permissions} from "../../../common/tools/utils";
import {ClientString} from "../../../common/tools/client_string";

const edit_dir_hbs = require('./edit_directory.hbs')
const edit_file_hbs = require('./edit_file.hbs')

async function spawn_item_context_action(item) {
    if (!PAGE_CONTEXT.display_repos)
        return;
    const actions = [];
    actions.push({
        title: "Partager",
        action: async () => {
            let url = `${location.host}${PAGE_CONTEXT.repos_path()}/file/${item.id}`;
            await navigator.clipboard.writeText(url);
            print_message('info', 'Lien copié dans le presse - papier', url)
        },
        image: '/images/icons/icons8-url-96.png'
    });

    actions.push({
        title: "Télécharger",
        action: () => {
            window.open(`${PAGE_CONTEXT.repos_path()}/file/${item.id}`, '_blank').focus();
        },
        image: '/images/icons/icons8-download-96.png'
    });

    if (await permissions.can_user_edit_item(REPOS_BUILDER.navigator.get_current_directory(), item.id)) {
        actions.push({
            title: "Modifier",
            action: () => {
                if (item.is_regular_file)
                    open_modal(edit_file_hbs({path:`${PAGE_CONTEXT.repos_path()}/update/${item.id}`, item:item},
                        {
                            submit: async () => {
                                const data = {
                                    name: ClientString.FromClient(document.getElementById('name').value),
                                    description: ClientString.FromClient(document.getElementById('description').value)
                                }
                                await parse_fetch_result(await fetch(`${PAGE_CONTEXT.repos_path()}/update/${item.id}`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Accept': 'application/json',
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(data)
                                    }));

                                close_modal();
                            }
                        }));
                else
                    open_modal(edit_dir_hbs({path:`${PAGE_CONTEXT.repos_path()}/update/${item.id}`, item:item},

                        {
                            submit: async () => {
                                const data = {
                                    name: ClientString.FromClient(document.getElementById('name').value),
                                    description: ClientString.FromClient(document.getElementById('description').value),
                                    open_upload: document.getElementById('open_upload').value === "on",
                                }
                                await parse_fetch_result(await fetch(`${PAGE_CONTEXT.repos_path()}/update/${item.id}`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Accept': 'application/json',
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(data)
                                    }));

                                close_modal();
                            }
                        }));
            },
            image: '/images/icons/icons8-edit-96.png'
        });
        actions.push({
            title: "Supprimer",
            action: () => {
                const div = document.createElement('div')
                const p = document.createElement('p')
                p.innerText = `Êtes vous sur de vouloir supprimer ${item.name}`;
                div.append(p)
                const no_button = document.createElement('button')
                no_button.classList.add('cancel-button')
                no_button.innerText = 'Non';
                no_button.onclick = () => {
                    close_modal();
                }
                div.append(no_button)
                const confirm_button = document.createElement('button')
                confirm_button.innerText = 'Oui';
                confirm_button.onclick = async () => {
                    const result = await fetch(`${PAGE_CONTEXT.repos_path()}/remove/${item.id}`, {method: 'POST'});
                    if (result.status === 200) {
                        item.filesystem.remove_object(item.id);
                        print_message('info', `File removed`, `Successfully removed ${item.name}`);
                        close_modal();
                    } else if (result.status === 403) {
                        window.location = `/auth/signin/`;
                    } else {
                        print_message('error', `Failed to remove ${item.name}`, result.status);
                        update_repos_content();
                        close_modal();
                    }
                }
                div.append(confirm_button)
                open_modal(div, '500px', '100px');
            },
            image: '/images/icons/icons8-trash-52.png'
        })
    }

    spawn_context_action(actions);
}

export {spawn_item_context_action}