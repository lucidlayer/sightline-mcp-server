import sqlite3 from 'sqlite3';

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
}

export class GraphStore {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
    this.init();
  }

  private init() {
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

  createEntities(entities: Entity[]) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO entities (name, entityType, observations) VALUES (?, ?, ?)');
    for (const e of entities) {
      stmt.run(e.name, e.entityType, JSON.stringify(e.observations));
    }
    stmt.finalize();
  }

  createRelations(relations: Relation[]) {
    const stmt = this.db.prepare('INSERT INTO relations (fromEntity, toEntity, relationType) VALUES (?, ?, ?)');
    for (const r of relations) {
      stmt.run(r.from, r.to, r.relationType);
    }
    stmt.finalize();
  }

  addObservations(observations: { entityName: string; contents: string[] }[]) {
    for (const obs of observations) {
      this.db.get('SELECT observations FROM entities WHERE name = ?', obs.entityName, (err, row: { observations: string } | undefined) => {
        if (err || !row) return;
        let existing: string[] = [];
        try {
          existing = JSON.parse(row.observations);
        } catch {}
        const updated = existing.concat(obs.contents);
        this.db.run('UPDATE entities SET observations = ? WHERE name = ?', JSON.stringify(updated), obs.entityName);
      });
    }
  }

  searchNodes(query: string, callback: (results: Entity[]) => void) {
    this.db.all('SELECT * FROM entities', (err, rows) => {
      if (err) return callback([]);
      const matches = (rows as any[]).filter((row) => {
        const obs = JSON.parse((row as any).observations || '[]');
        return (
          (row as any).name.includes(query) ||
          (row as any).entityType.includes(query) ||
          obs.some((o: string) => o.includes(query))
        );
      }).map((row) => ({
        name: (row as any).name,
        entityType: (row as any).entityType,
        observations: JSON.parse((row as any).observations || '[]')
      }));
      callback(matches);
    });
  }

  openNodes(names: string[], callback: (results: Entity[]) => void) {
    const placeholders = names.map(() => '?').join(',');
    this.db.all(`SELECT * FROM entities WHERE name IN (${placeholders})`, names, (err, rows) => {
      if (err) return callback([]);
      const entities = (rows as any[]).map((row) => ({
        name: (row as any).name,
        entityType: (row as any).entityType,
        observations: JSON.parse((row as any).observations || '[]')
      }));
      callback(entities);
    });
  }

  getRelations(callback: (relations: Relation[]) => void) {
    this.db.all('SELECT * FROM relations', (err, rows) => {
      if (err) return callback([]);
      const rels = (rows as any[]).map((row) => ({
        from: (row as any).fromEntity,
        to: (row as any).toEntity,
        relationType: (row as any).relationType
      }));
      callback(rels);
    });
  }
}
