"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

from flwr.server.strategy import FedAvg
from typing import Dict, List, Optional, Tuple
from flwr.common import FitIns, Parameters

class CustomDPFedAvg(FedAvg):
    def __init__(self, clip_norm: float, noise_stddev: float, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.clip_norm = clip_norm
        self.noise_stddev = noise_stddev

    def configure_fit(
        self, server_round: int, parameters: Parameters, client_manager
    ) -> List[Tuple[str, FitIns]]:
        # Get default fit instructions
        fit_instructions = super().configure_fit(server_round, parameters, client_manager)

        # Add DP configurations
        for i, (cid, fit_ins) in enumerate(fit_instructions):
            fit_config = fit_ins.config
            fit_config["dpfedavg_clip_norm"] = self.clip_norm
            fit_config["dpfedavg_noise_stddev"] = self.noise_stddev
            fit_instructions[i] = (cid, FitIns(fit_ins.parameters, fit_config))

        return fit_instructions

