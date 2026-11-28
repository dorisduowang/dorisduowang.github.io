#!/usr/bin/env python3
"""Offline, standard-library reproduction of six separate saved-data studies."""
import argparse, json, subprocess, sys
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--full', action='store_true', help='Print every recomputed group and metric')
args=parser.parse_args()
root=Path(__file__).resolve().parent
studies=('announcement_screen','current_policy','reference_inheritance','early_warning','enforcement_demand','mixed_model')
results={}
for study in studies:
    p=subprocess.run([sys.executable,'-B',str(root/'studies'/study/'reproduce.py')],capture_output=True,text=True,check=True)
    value=json.loads(p.stdout)
    assert value['verified'] is True
    if args.full:
        results[study]=value
    else:
        fields=('verified','independent_units','fresh_games','fresh_openings','collected_rounds','arm_means','full20_openings','contrasts','relative_position','old_LIVE_minus_H_opening','new_LIVE_minus_H_opening','mean_net_H','mean_net_HL','mean_HL_minus_H','percent_difference_relative_to_H','independent_blocks','primary_mean_delta_ref','secondary_mean_policy_by_reference_interaction','source_games','transitions','candidate_transitions','risk_events','unpunished_drop_events','source_histories','blocks_source_by_repeat','paired_states','positive_pairs','negative_pairs','behavioral_gate_pass')
        results[study]={k:value[k] for k in fields if k in value}
        if study=='enforcement_demand':results[study]['groups']=len(value['groups'])
print(json.dumps({'all_studies_verified':True,'study_count':len(studies),'new_model_calls':0,'new_scorer_calls':0,'results':results},indent=2))
