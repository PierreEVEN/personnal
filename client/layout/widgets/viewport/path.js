import {selector} from "../../../common/tools/selector.js";

const current_path = document.getElementById('current-path');

function update_dir(new_dir) {
    if (!new_dir || !current_path)
        return;

    current_path.innerHTML = '';

    const dirs = new_dir.parent_dirs();
    while (dirs.length > 0) {
        const dir = dirs.pop();


        if (dir.parent) {
            // Add separator between directories
            const separator = document.createElement('p')
            separator.innerText = '>'
            current_path.append(separator);
        }

        // Add button for each directory of the current path
        const button = document.createElement('button')
        button.innerText = dir.name;
        button.onclick = () => selector.set_current_dir(dir);
        current_path.append(button);
    }

    const full_path = new_dir.absolute_path();
    window.history.pushState(full_path, null, `${window.location.href.split('?')[0]}?repos=${current_repos.access_key}&directory=${full_path}`);
}

selector.on_changed_dir((new_dir, _) => update_dir(new_dir));
update_dir(selector.last_directory);