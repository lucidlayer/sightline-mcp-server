"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphStore = void 0;
class GraphStore {
    constructor(db) {
        this.db = db;
        this.init();
    }
    init() {
        this.db.run(`CREATE TABLE IF NOT EXISTS entities (
      name TEXT PRIMARY KEY,
      entityType TEXT,
      observations TEXT
    )`);
        this.db.run(`CREATE TABLE IF NOT EXISTS relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromEntity TEXT,
      toEntity TEXT,
      relationType TEXT
    )`);
    }
    createEntities(entities) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO entities (name, entityType, observations) VALUES (?, ?, ?)');
        for (const e of entities) {
            stmt.run(e.name, e.entityType, JSON.stringify(e.observations));
        }
        stmt.finalize();
    }
    createRelations(relations) {
        const stmt = this.db.prepare('INSERT INTO relations (fromEntity, toEntity, relationType) VALUES (?, ?, ?)');
        for (const r of relations) {
            stmt.run(r.from, r.to, r.relationType);
        }
        stmt.finalize();
    }
    addObservations(observations) {
        for (const obs of observations) {
            this.db.get('SELECT observations FROM entities WHERE name = ?', obs.entityName, (err, row) => {
                if (err || !row)
                    return;
                let existing = [];
                try {
                    existing = JSON.parse(row.observations);
                }
                catch { }
                const updated = existing.concat(obs.contents);
                this.db.run('UPDATE entities SET observations = ? WHERE name = ?', JSON.stringify(updated), obs.entityName);
            });
        }
    }
    searchNodes(query, callback) {
        this.db.all('SELECT * FROM entities', (err, rows) => {
            if (err)
                return callback([]);
            const matches = rows.filter((row) => {
                const obs = JSON.parse(row.observations || '[]');
                return (row.name.includes(query) ||
                    row.entityType.includes(query) ||
                    obs.some((o) => o.includes(query)));
            }).map((row) => ({
                name: row.name,
                entityType: row.entityType,
                observations: JSON.parse(row.observations || '[]')
            }));
            callback(matches);
        });
    }
    openNodes(names, callback) {
        const placeholders = names.map(() => '?').join(',');
        this.db.all(`SELECT * FROM entities WHERE name IN (${placeholders})`, names, (err, rows) => {
            if (err)
                return callback([]);
            const entities = rows.map((row) => ({
                name: row.name,
                entityType: row.entityType,
                observations: JSON.parse(row.observations || '[]')
            }));
            callback(entities);
        });
    }
    getRelations(callback) {
        this.db.all('SELECT * FROM relations', (err, rows) => {
            if (err)
                return callback([]);
            const rels = rows.map((row) => ({
                from: row.fromEntity,
                to: row.toEntity,
                relationType: row.relationType
            }));
            callback(rels);
        });
    }
}
exports.GraphStore = GraphStore;
