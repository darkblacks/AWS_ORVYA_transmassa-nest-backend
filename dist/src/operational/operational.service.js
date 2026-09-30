"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationalService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_service_1 = require("../database/database.service");
let OperationalService = class OperationalService {
    db;
    config;
    constructor(db, config) {
        this.db = db;
        this.config = config;
    }
    cleanPlate(value = '') {
        return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    async health() {
        const [mysqlOk, pgOk] = await Promise.all([
            this.db.operational('SELECT 1 AS ok').then(() => true).catch(() => false),
            this.db.panel('SELECT 1 AS ok').then(() => true).catch(() => false)
        ]);
        return { ok: mysqlOk && pgOk, mysql: mysqlOk, panelDb: pgOk, service: 'transmassa-panel-api' };
    }
    async fleetCatalog() {
        const fleet = await this.getFleet();
        return fleet.map(item => ({
            plate: item.plate,
            vehicleType: item.vehicleType || 'Não identificado',
            source: 'MYSQL'
        }));
    }
    async overview() {
        const [fleet, activeManifests, mappingRows, openMaintenance] = await Promise.all([
            this.getFleet(),
            this.getActiveManifests(),
            this.getMappingRows(),
            this.getOpenMaintenance()
        ]);
        const manifestsByPlate = new Map();
        for (const row of activeManifests) {
            const plate = this.cleanPlate(row.veiculoPlaca);
            if (!plate)
                continue;
            const list = manifestsByPlate.get(plate) || [];
            list.push(row);
            manifestsByPlate.set(plate, list);
        }
        for (const list of manifestsByPlate.values()) {
            list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        }
        const mappingByPlate = new Map(mappingRows.map(row => [row.plate, row]));
        const operationContexts = await this.getOperationContexts(activeManifests, mappingByPlate);
        const maintenanceByPlate = new Map();
        for (const os of openMaintenance) {
            const plate = this.cleanPlate(os.veiculo_placa);
            if (!plate)
                continue;
            const current = maintenanceByPlate.get(plate);
            if (!current ||
                new Date(os.updated_at || os.data_e_hora || 0).getTime() >
                    new Date(current.updated_at || current.data_e_hora || 0).getTime()) {
                maintenanceByPlate.set(plate, os);
            }
        }
        const vehicles = fleet.map(vehicle => {
            const manifests = manifestsByPlate.get(vehicle.plate) || [];
            const manifest = manifests[0] || null;
            const mapping = mappingByPlate.get(vehicle.plate);
            const ownership = this.ownershipFromManifest(manifest);
            const maintenance = maintenanceByPlate.get(vehicle.plate) || null;
            const status = maintenance
                ? 'MAINTENANCE'
                : this.statusForMany(manifests);
            const manifestDtos = manifests.map(item => this.manifestDto(item, mapping?.service_override || null, operationContexts.get(Number(item.id))));
            return {
                plate: vehicle.plate,
                vehicleType: mapping?.vehicle_type || vehicle.vehicleType || 'Não identificado',
                fleetSource: 'MYSQL',
                operationalStatus: status,
                ownership: ownership.ownership,
                thirdPartyName: ownership.thirdPartyName,
                capacityKg: 0,
                loadKg: manifestDtos
                    .filter(item => item.operationallyValid)
                    .reduce((sum, item) => sum + Number(item.pesoKg || 0), 0),
                utilizationPercent: null,
                manifest: manifestDtos.find(item => item.operationallyValid) || null,
                activeManifests: manifestDtos,
                operationalAlerts: [
                    ...manifestDtos
                        .filter(item => !item.operationallyValid)
                        .map(item => ({
                        type: 'MANIFEST_WITHOUT_SERVICE',
                        severity: 'CRITICAL',
                        manifestId: item.id,
                        manifestNumber: item.numero,
                        manifestStatus: item.status || '',
                        message: 'Manifesto sem serviço vinculado e ignorado no estado operacional do veículo'
                    })),
                    ...(maintenance && manifestDtos.some(item => item.operationallyValid)
                        ? [{
                                type: 'MAINTENANCE_WITH_ACTIVE_OPERATION',
                                severity: 'CRITICAL',
                                serviceOrderId: maintenance.id,
                                serviceOrderNumber: maintenance.numero,
                                message: 'Veículo em manutenção possui operação ativa'
                            }]
                        : [])
                ],
                maintenance: maintenance
                    ? this.maintenanceDto(maintenance)
                    : null
            };
        });
        const counts = {
            total: vehicles.length,
            available: vehicles.filter(v => v.operationalStatus === 'AVAILABLE').length,
            committed: vehicles.filter(v => v.operationalStatus === 'COMMITTED').length,
            inTransit: vehicles.filter(v => v.operationalStatus === 'IN_TRANSIT').length,
            maintenance: vehicles.filter(v => v.operationalStatus === 'MAINTENANCE').length
        };
        return {
            generatedAt: new Date().toISOString(),
            source: { operational: 'MYSQL', panel: 'PostgreSQL' },
            counts,
            breakdowns: {
                available: this.breakdown(vehicles, 'AVAILABLE'),
                committed: this.breakdown(vehicles, 'COMMITTED'),
                inTransit: this.breakdown(vehicles, 'IN_TRANSIT'),
                maintenance: this.breakdown(vehicles, 'MAINTENANCE')
            },
            preferences: null,
            activeFleetGroup: null,
            vehicles
        };
    }
    async getFleet() {
        const discoveryDays = Number(this.config.get('FLEET_DISCOVERY_DAYS') || 365);
        const rows = await this.db.operational(`SELECT UPPER(REPLACE(REPLACE(TRIM(m.veiculoPlaca), '-', ''), ' ', '')) AS plate,
              MAX(m.data) AS lastManifestDate,
              'Cavalo' AS vehicleType
       FROM manifestos m
       WHERE m.veiculoPlaca IS NOT NULL
         AND TRIM(m.veiculoPlaca) <> ''
         AND m.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY plate
       ORDER BY plate`, [discoveryDays]);
        return rows
            .map(row => ({ plate: this.cleanPlate(row.plate), vehicleType: String(row.vehicleType || 'Cavalo') }))
            .filter(row => row.plate);
    }
    async getActiveManifests() {
        const windowDays = Number(this.config.get('OPERATIONAL_WINDOW_DAYS') || 7);
        return this.db.operational(`SELECT m.*
       FROM manifestos m
       WHERE m.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND m.veiculoPlaca IS NOT NULL
         AND TRIM(m.veiculoPlaca) <> ''
         AND (
           LOWER(m.status) LIKE '%pendente%'
           OR LOWER(m.status) LIKE '%em trânsito%'
           OR LOWER(m.status) LIKE '%em transito%'
           OR LOWER(m.status) LIKE '%program%'
           OR LOWER(m.status) LIKE '%aguard%'
           OR LOWER(m.status) LIKE '%aberto%'
         )
       ORDER BY m.veiculoPlaca, m.id DESC`, [windowDays]);
    }
    async getOpenMaintenance() {
        return this.db.operational(`SELECT *
       FROM os
       WHERE deleted_at IS NULL
         AND veiculo_placa IS NOT NULL
         AND TRIM(veiculo_placa) <> ''
         AND (
           LOWER(COALESCE(status, '')) LIKE '%pendente%'
           OR LOWER(COALESCE(status, '')) LIKE '%aberto%'
           OR LOWER(COALESCE(status, '')) LIKE '%andamento%'
           OR LOWER(COALESCE(status, '')) LIKE '%aguard%'
         )
       ORDER BY updated_at DESC, id DESC`);
    }
    maintenanceDto(os) {
        return {
            id: os.id,
            serviceOrderId: os.id,
            serviceOrderNumber: os.numero || os.id,
            status: os.status || '',
            type: os.tipo_manutencao || '',
            location: os.local_servico || '',
            description: os.descricao_do_servico || '',
            openedAt: os.data_e_hora || os.created_at || null,
            updatedAt: os.updated_at || null,
            daysInMaintenance: Number(os.periodo_do_servico || 0),
            odometer: Number(os.hodometro_atual || 0),
            laborTotal: Number(os.total_mao_de_obra || 0),
            partsTotal: Number(os.custo_total_das_pecas || 0),
            total: Number(os.custo_total_do_servico || 0),
            vehicleModel: os.veiculo_modelo || '',
            branch: os.pessoa_fantasia || ''
        };
    }
    async maintenanceDetail(plateRaw) {
        const plate = this.cleanPlate(plateRaw);
        const rows = await this.db.operational(`SELECT *
       FROM os
       WHERE UPPER(REPLACE(REPLACE(TRIM(veiculo_placa), '-', ''), ' ', '')) = ?
         AND deleted_at IS NULL
       ORDER BY id DESC
       LIMIT 50`, [plate]);
        const active = rows.find(row => {
            const status = String(row.status || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            return (status.includes('pendente') ||
                status.includes('aberto') ||
                status.includes('andamento') ||
                status.includes('aguard'));
        }) || null;
        return {
            plate,
            active: active ? this.maintenanceDto(active) : null,
            history: rows.map(row => this.maintenanceDto(row))
        };
    }
    async getMappingRows() {
        const result = await this.db.panel(`SELECT m.plate, m.vehicle_type, m.service_override, m.branch_code, m.owner_code
       FROM panel_fleet_group_members m
       INNER JOIN panel_fleet_groups g ON g.id = m.group_id
       WHERE g.slug = 'grupo-consolidado-alexandre'`);
        return result.rows;
    }
    hasOperationalService(manifest) {
        return (Number(manifest.entregas || 0) > 0 ||
            Number(manifest.transferencias || 0) > 0 ||
            Number(manifest.coletas || 0) > 0);
    }
    statusForMany(manifests) {
        const validManifests = manifests.filter(manifest => this.hasOperationalService(manifest));
        if (!validManifests.length)
            return 'AVAILABLE';
        const statuses = validManifests.map(manifest => String(manifest.status || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase());
        if (statuses.some(status => status.includes('em transito'))) {
            return 'IN_TRANSIT';
        }
        if (statuses.some(status => status.includes('program') ||
            status.includes('aguard') ||
            status.includes('pendente') ||
            status.includes('aberto'))) {
            return 'COMMITTED';
        }
        return 'AVAILABLE';
    }
    ownershipFromManifest(manifest) {
        const driver = String(manifest?.motorista_nome || '');
        if (driver.includes(' - ')) {
            return { ownership: 'THIRD_PARTY', thirdPartyName: driver.split(' - ').slice(1).join(' - ').trim() };
        }
        return { ownership: 'OWN', thirdPartyName: '' };
    }
    manifestDto(manifest, serviceOverride, context) {
        const entregas = Number(manifest.entregas || 0);
        const transferencias = Number(manifest.transferencias || 0);
        const coletas = Number(manifest.coletas || 0);
        const operationallyValid = this.hasOperationalService(manifest);
        let detectedService = 'Inconsistente';
        if (entregas > 0) {
            detectedService = 'Distribuição/Lotação';
        }
        else if (transferencias > 0) {
            detectedService = 'Transferência';
        }
        else if (coletas > 0) {
            detectedService = 'Coleta';
        }
        const service = operationallyValid
            ? (serviceOverride || detectedService)
            : 'Inconsistente';
        return {
            id: manifest.id,
            numero: manifest.numero || manifest.id,
            data: manifest.data,
            generatedAt: manifest.dataCriacao || manifest.created_at || manifest.data,
            saida: manifest.saida,
            status: manifest.status,
            motorista: manifest.motorista_nome,
            trailers: [
                manifest.reboque1Placa,
                manifest.reboque2Placa
            ]
                .map(value => this.cleanPlate(value))
                .filter(Boolean),
            trailerIds: [
                manifest.reboque1Id,
                manifest.reboque2Id
            ].filter(Boolean),
            quantidadeDestinos: Number(manifest.quantidadeDestinos || 0),
            qtdNf: 0,
            volumesNf: 0,
            pesoKg: this.loadKg(manifest),
            entregas,
            transferencias,
            coletas,
            service,
            operationallyValid,
            inconsistency: operationallyValid
                ? null
                : {
                    type: 'MANIFEST_WITHOUT_SERVICE',
                    severity: 'CRITICAL',
                    message: 'Manifesto sem serviço vinculado e ignorado no estado operacional do veículo'
                },
            operationContext: operationallyValid
                ? (context || {
                    label: service,
                    kind: this.operationKind(service),
                    details: []
                })
                : {
                    label: 'Manifesto inconsistente',
                    kind: 'UNKNOWN',
                    details: ['Sem coleta, transferência ou distribuição vinculada']
                },
            destinationText: operationallyValid ? (context?.label || '') : '',
            transferBase: context?.kind === 'TRANSFER'
                ? String(context.label.split('→')[0] || '').trim()
                : '',
            transferDestination: context?.kind === 'TRANSFER'
                ? String(context.label.split('→')[1] || '').trim()
                : '',
            observacoes: ''
        };
    }
    async manifestDetail(id) {
        const manifestRows = await this.db.operational(`SELECT * FROM manifestos WHERE id = ? LIMIT 1`, [id]);
        const manifest = manifestRows[0];
        if (!manifest) {
            throw new common_1.NotFoundException('Manifesto não encontrado');
        }
        const links = await this.db.operational(`SELECT frete_id
       FROM frete_manifesto
       WHERE manifesto_id = ?`, [id]);
        const freteIds = links
            .map(row => Number(row.frete_id))
            .filter(Number.isFinite);
        let fretes = [];
        let notasFiscais = [];
        if (freteIds.length) {
            const placeholders = freteIds.map(() => '?').join(',');
            fretes = await this.db.operational(`SELECT
           id, numero, data_frete, nfs, peso, peso_real, valor,
           pagador_nome, pagador_fantasia,
           destinatario_nome, destinatario_fantasia,
           destinatario_endereco, destinatario_numero,
           destinatario_complemento, destinatario_bairro,
           destinatario_cidade, destinatario_uf, destinatario_cep,
           data_entrega, data_recebimento
         FROM fretes
         WHERE id IN (${placeholders})
         ORDER BY destinatario_cidade, destinatario_nome
         LIMIT 300`, freteIds);
            notasFiscais = await this.db.operational(`SELECT
           id, frete_id, numero_nf, serie, chave_nfe, pedido,
           emissao, volumes, peso, valor
         FROM notas_fiscais
         WHERE frete_id IN (${placeholders})
         ORDER BY numero_nf
         LIMIT 1000`, freteIds);
        }
        const coletas = await this.db.operational(`SELECT
         numero, data_solicitacao, solicitante, volumes, peso,
         remetente_nome, remetente_fantasia, remetente_endereco,
         remetente_numero, remetente_complemento, remetente_bairro,
         remetente_cidade, remetente_uf, remetente_cep
       FROM coletas
       WHERE manifesto_id = ?
       ORDER BY numero
       LIMIT 200`, [id]);
        const mappingRows = await this.getMappingRows();
        const mapping = mappingRows.find(row => row.plate === this.cleanPlate(manifest.veiculoPlaca));
        const service = mapping?.service_override ||
            this.classifyManifestService(manifest);
        const context = this.contextFromRows(manifest, service, fretes, coletas, mapping?.branch_code || null);
        return {
            manifest,
            service,
            operationContext: context,
            fretes,
            notasFiscais,
            coletas,
            cache: 'MISS'
        };
    }
    classifyManifestService(manifest) {
        const entregas = Number(manifest.entregas || 0);
        const transferencias = Number(manifest.transferencias || 0);
        if (entregas > 0)
            return 'Distribuição/Lotação';
        if (transferencias > 0)
            return 'Transferência';
        return 'Coleta';
    }
    normalizeBranchLabel(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'SP')
            return 'SBC';
        if (normalized === 'RJ')
            return 'RJ';
        if (normalized === 'RB')
            return 'RB';
        return normalized;
    }
    destinationBaseFromFreights(rows) {
        const ufs = rows
            .map(row => String(row.destinatario_uf || '').trim().toUpperCase())
            .filter(Boolean);
        const cities = rows
            .map(row => String(row.destinatario_cidade || '').trim().toUpperCase())
            .filter(Boolean);
        if (ufs.includes('RJ'))
            return 'RJ';
        if (cities.some(city => city.includes('RIBEIRAO PRETO') ||
            city.includes('RIBEIRÃO PRETO'))) {
            return 'RB';
        }
        if (ufs.includes('SP'))
            return 'SBC';
        return ufs[0] || '';
    }
    formatFreightAddress(row) {
        const street = String(row.destinatario_endereco || '').trim();
        const number = String(row.destinatario_numero || '').trim();
        const complement = String(row.destinatario_complemento || '').trim();
        const district = String(row.destinatario_bairro || '').trim();
        const city = String(row.destinatario_cidade || '').trim();
        const uf = String(row.destinatario_uf || '').trim();
        const first = [street, number].filter(Boolean).join(', ');
        const second = [district, city, uf].filter(Boolean).join(' - ');
        return [first, complement, second]
            .filter(Boolean)
            .join(' · ');
    }
    contextFromRows(manifest, service, fretes, coletas, branchCode) {
        const kind = this.operationKind(service);
        if (kind === 'DISTRIBUTION') {
            const addresses = [
                ...new Set(fretes
                    .map(row => this.formatFreightAddress(row))
                    .filter(Boolean))
            ];
            return {
                kind,
                label: addresses[0] || 'Endereço não encontrado',
                details: addresses
            };
        }
        if (kind === 'COLLECTION') {
            const clients = [
                ...new Set(coletas
                    .map(row => String(row.remetente_fantasia ||
                    row.remetente_nome ||
                    row.solicitante ||
                    '').trim())
                    .filter(Boolean))
            ];
            return {
                kind,
                label: clients[0] || 'Cliente não identificado',
                details: clients
            };
        }
        if (kind === 'TRANSFER') {
            const origin = this.normalizeBranchLabel(branchCode);
            const destination = this.destinationBaseFromFreights(fretes);
            let label = 'Transferência';
            if (origin && destination && origin !== destination) {
                label = `${origin} → ${destination}`;
            }
            else if (destination) {
                label = `Base ${destination}`;
            }
            else if (origin) {
                label = `${origin} → destino não identificado`;
            }
            return {
                kind,
                label,
                details: fretes
                    .map(row => this.formatFreightAddress(row))
                    .filter(Boolean)
            };
        }
        return {
            kind: 'OTHER',
            label: 'Sem serviço',
            details: []
        };
    }
    async getOperationContexts(manifests, mappingByPlate) {
        const result = new Map();
        const ids = manifests
            .map(m => Number(m.id))
            .filter(Number.isFinite);
        if (!ids.length)
            return result;
        const placeholders = ids.map(() => '?').join(',');
        const links = await this.db.operational(`SELECT manifesto_id, frete_id
       FROM frete_manifesto
       WHERE manifesto_id IN (${placeholders})`, ids);
        const freteIds = [
            ...new Set(links
                .map(row => Number(row.frete_id))
                .filter(Number.isFinite))
        ];
        const fretesById = new Map();
        if (freteIds.length) {
            const fp = freteIds.map(() => '?').join(',');
            const fretes = await this.db.operational(`SELECT
           id,
           destinatario_nome,
           destinatario_fantasia,
           destinatario_endereco,
           destinatario_numero,
           destinatario_complemento,
           destinatario_bairro,
           destinatario_cidade,
           destinatario_uf
         FROM fretes
         WHERE id IN (${fp})`, freteIds);
            for (const row of fretes) {
                fretesById.set(Number(row.id), row);
            }
        }
        const fretesByManifest = new Map();
        for (const link of links) {
            const manifestId = Number(link.manifesto_id);
            const frete = fretesById.get(Number(link.frete_id));
            if (!frete)
                continue;
            const list = fretesByManifest.get(manifestId) || [];
            list.push(frete);
            fretesByManifest.set(manifestId, list);
        }
        const coletas = await this.db.operational(`SELECT
         manifesto_id,
         numero,
         solicitante,
         remetente_nome,
         remetente_fantasia,
         remetente_cidade,
         remetente_uf
       FROM coletas
       WHERE manifesto_id IN (${placeholders})
       ORDER BY numero`, ids);
        const coletasByManifest = new Map();
        for (const row of coletas) {
            const manifestId = Number(row.manifesto_id);
            const list = coletasByManifest.get(manifestId) || [];
            list.push(row);
            coletasByManifest.set(manifestId, list);
        }
        for (const manifest of manifests) {
            const id = Number(manifest.id);
            const mapping = mappingByPlate.get(this.cleanPlate(manifest.veiculoPlaca));
            const service = mapping?.service_override ||
                this.classifyManifestService(manifest);
            result.set(id, this.contextFromRows(manifest, service, fretesByManifest.get(id) || [], coletasByManifest.get(id) || [], mapping?.branch_code || null));
        }
        return result;
    }
    operationKind(service) {
        const normalized = service.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (normalized.includes('distrib') || normalized.includes('lotacao'))
            return 'DISTRIBUTION';
        if (normalized.includes('transfer'))
            return 'TRANSFER';
        if (normalized.includes('coleta'))
            return 'COLLECTION';
        return 'OTHER';
    }
    loadKg(manifest) {
        return Number(manifest?.totalPesoReal || manifest?.totalPesoTaxado || 0);
    }
    breakdown(vehicles, status) {
        const counts = new Map();
        for (const vehicle of vehicles.filter(item => item.operationalStatus === status)) {
            counts.set(vehicle.vehicleType, (counts.get(vehicle.vehicleType) || 0) + 1);
        }
        return [...counts.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
    }
};
exports.OperationalService = OperationalService;
exports.OperationalService = OperationalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        config_1.ConfigService])
], OperationalService);
//# sourceMappingURL=operational.service.js.map