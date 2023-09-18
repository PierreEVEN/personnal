import {humanFileSize} from "../../../common/tools/utils.js";
import * as handlebars from "handlebars";

let opened_item_div = null;

function open_this_item(div, file) {
    import('../../../embed_viewers').then(_ => {
        const ctx = {
            'close_item_plain': close_item_plain,
        };
        if (!opened_item_div) {
            opened_item_div = require('./item.hbs')({item: file, file_size: humanFileSize(file.size)}, ctx);
            document.body.append(opened_item_div);
        } else {
            document.getElementById('item-title').innerText = file.name;
            document.getElementById('item-size').innerText = humanFileSize(file.size);
            document.getElementById('item-mime-type').innerText = file.mimetype;
            document.getElementById('item-description').innerText = 'TODO : improve regeneration';
            document.getElementById('item-content').innerHTML = handlebars.compile('{{item_image item}}')({item: file});
        }
    });
}

window.addEventListener('resize', _ => {
    if (opened_item_div) {
        opened_item_div.style.width = window.innerWidth + 'px';
        opened_item_div.style.height = window.innerHeight + 'px';
    }
})

function close_item_plain() {
    if (opened_item_div)
        opened_item_div.remove();
    opened_item_div = null;
}

function is_opened() {
    return !!opened_item_div;
}

export {open_this_item, is_opened, close_item_plain}