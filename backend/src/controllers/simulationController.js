import { startSimulation, stopSimulation, getSimulationStatus } from '../services/simulationService.js';

export function startSim(req, res) {
    const result = startSimulation();
    res.json(result);
}

export function stopSim(req, res) {
    const result = stopSimulation();
    res.json(result);
}

export function getStatus(req, res) {
    const result = getSimulationStatus();
    res.json(result);
}
