const db = require('./../../../database')
const Users = require('./user')

const Storage = require('../storage')
const crypto = require("crypto");
const repos_storage_id = new Storage();
const repos_storage_key = new Storage();

class Repos {
    constructor(id) {
        this._id = id;
    }

    /**
     * @return {Number}
     */
    get_id() {
        return this._id;
    }

    /**
     * @return {Promise<string>}
     */
    async get_name() {
        if (!this._name)
            await this._update_data_internal()
        return this._name;
    }

    /**
     * @return {Promise<User>}
     */
    async get_owner() {
        if (!this._owner)
            await this._update_data_internal()
        return this._owner;
    }

    /**
     * @return {Promise<string>}
     */
    async get_status() {
        if (!this._status)
            await this._update_data_internal()
        return this._status;
    }

    /**
     * @return {Promise<string>}
     */
    async get_access_key() {
        if (!this._access_key)
            await this._update_data_internal()
        return this._access_key;
    }

    /**
     * @return {Promise<int>}
     */
    async get_visitor_file_lifetime() {
        if (!this._visitor_file_lifetime)
            await this._update_data_internal()
        return this._visitor_file_lifetime;
    }

    /**
     * @return {Promise<int>}
     */
    async get_max_file_size() {
        if (!this._max_file_size)
            await this._update_data_internal()
        return this._max_file_size;
    }

    /**
     * @return {Promise<boolean>}
     */
    async does_allow_visitor_upload() {
        if (!this._allow_visitor_upload)
            await this._update_data_internal()
        return this._allow_visitor_upload;
    }

    async _update_data_internal() {
        const connection = await db();
        const result = await connection.query('SELECT * FROM Personal.Repos WHERE id = ?', [this._id])
        await connection.end();

        if (Object.values(result).length > 0) {
            const data = result[0];
            this._owner = await Users.find(data.owner);
            this._name = data.name;
            this._status = data.status;
            this._access_key = data.access_key;
            this._max_file_size = data.max_file_size;
            this._visitor_file_lifetime = data.visitor_file_lifetime;
            this._allow_visitor_upload = data.allow_visitor_upload;
        } else {
            throw new Error(`Failed to get repos id '${this._id}'`);
        }
    }

    async delete() {
        const File = require('./files')
        const connection = await db();
        for (const file of Object.values(await connection.query("SELECT * FROM Personal.Files WHERE repos = ?", [this._id]))) {
            const found_file = await File.find(file.id)
            await found_file.delete();
        }

        await connection.query("DELETE FROM Personal.UserRepos WHERE repos = ?", [this._id]);
        await connection.query("DELETE FROM Personal.Repos WHERE id = ?", [this._id]);
        await connection.end();

        repos_storage_id.clear(this._id);
        repos_storage_key.clear(this._access_key);
    }

    async public_data(include_content = false) {
        if (!this._owner) {
            await this._update_data_internal()
        }

        const content = []
        if (include_content) {

            const connection = await db();
            const files = Object.values(await connection.query("SELECT * FROM Personal.Files WHERE repos = ?", [this.get_id()]))
            await connection.end()
            for (const file of files) {
                content.push({
                    id: file.id,
                    name: decodeURIComponent(file.name),
                    size: Number(file.size),
                    mimetype: file.mimetype,
                    description: file.description,
                    virtual_folder: file.virtual_folder,
                })
            }
        }

        return {
            content: include_content ? content : null,
            id: this._id,
            owner: await this._owner.public_data(),
            name: this._name,
            status: this._status,
            access_key: this._access_key,
        }
    }
}

async function init_table() {

    const connection = await db();

    // Create Accounts table if needed
    if (Object.entries(await connection.query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'Personal' AND TABLE_NAME = 'Repos'")).length === 0) {
        await connection.query(`CREATE TABLE Personal.Repos (
            id int AUTO_INCREMENT PRIMARY KEY,
            name varchar(200) UNIQUE NOT NULL,
            owner int NOT NULL,
            status ENUM('private', 'hidden', 'public') DEFAULT 'hidden' NOT NULL,
            access_key varchar(32) NOT NULL UNIQUE,
            max_file_size BIGINT DEFAULT 1048576000,
            visitor_file_lifetime int,
            allow_visitor_upload BOOLEAN DEFAULT false NOT NULL,
            FOREIGN KEY(owner) REFERENCES Personal.Users(id)
        );`)
    }

    await connection.end();
}

const table_created = init_table();

/**
 * @return {Repos}
 */
async function find(id) {
    return await table_created.then(async () => {
        let repos = repos_storage_id.find(id);
        if (!repos) {
            repos = new Repos(id);
            repos_storage_id.add(id, repos);
            repos_storage_key.add(await repos.get_access_key(), repos)
        }
        return repos;
    })
}

/**
 * @return {Promise<Repos>}
 */
async function find_access_key(access_key) {
    return await table_created.then(async () => {
        let repos = repos_storage_key.find(access_key);
        if (!repos) {
            const connection = await db();
            const entry = Object.values(await connection.query("SELECT * FROM Repos WHERE access_key = ?", [access_key]))
            if (entry.length > 0) {
                repos = new Repos(entry[0].id);
                repos_storage_id.add(repos.get_id(), repos);
                repos_storage_key.add(access_key, repos)
            }
            await connection.end()
        }
        return repos;
    })
}

/**
 * @return {Promise<Repos>}
 */
async function insert(name, owner, status, custom_access_key = null) {
    return await table_created.then(async () => {
        const connection = await db();

        let access_key = null;
        if (custom_access_key) {
            access_key = custom_access_key
        }
        else {
            do {
                access_key = crypto.randomBytes(16).toString("hex");
            }
            while (Object.entries(await connection.query('SELECT * FROM Personal.Repos WHERE access_key = ?', [access_key])).length > 0);
        }

        const result = await connection.query('INSERT INTO Personal.Repos (name, owner, status, access_key) VALUES (?, ?, ?, ?)', [name, owner.get_id(), status, access_key]);
        await connection.end();

        return find(Number(result.insertId));
    })
}


/**
 * @return {Promise<[Repos]>}
 */
async function find_user(user) {
    return await table_created.then(async () => {
        const connection = await db();
        const user_repos = []
        for (const entry of Object.values(await connection.query("SELECT * FROM Personal.Repos WHERE owner = ?", [await user.get_id()]))) {
            user_repos.push(await find(entry.id))
        }
        await connection.end();
        return user_repos;
    })
}

/**
 * @return {Promise<[Repos]>}
 */
async function find_public() {
    return await table_created.then(async () => {
        const connection = await db();
        const user_repos = []
        for (const entry of Object.values(await connection.query("SELECT * FROM Personal.Repos WHERE status = 'public'"))) {
            user_repos.push(await find(entry.id))
        }
        await connection.end();
        return user_repos;
    })
}

module.exports = {find, find_access_key, insert, find_user, find_public};