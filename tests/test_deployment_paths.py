import pathlib
import unittest
import yaml

ROOT=pathlib.Path(__file__).resolve().parents[1]
WORKFLOWS=ROOT/'.github/workflows'

class DeploymentPathTests(unittest.TestCase):
    def test_only_one_production_pages_deploy_job(self):
        deploys=[]
        for path in WORKFLOWS.glob('*.yml'):
            doc=yaml.load(path.read_text(encoding='utf-8'),Loader=yaml.BaseLoader)
            for job in doc.get('jobs',{}).values():
                for step in job.get('steps',[]):
                    run=step.get('run','')
                    if 'pages deploy app' in run and '--branch main' in run:
                        deploys.append(path.name)
        self.assertEqual(deploys,['guided-ui-production.yml'])
    def test_single_pages_deploy_proves_production_asset_identity(self):
        yml=(WORKFLOWS/'guided-ui-production.yml').read_text(encoding='utf-8')
        self.assertIn('verify_live_release.py',yml)
        self.assertIn('build-info.json',yml)
        self.assertIn('CLOUDFLARE_API_TOKEN',yml)
        self.assertIn("production_branch",yml)
        self.assertIn("persist-credentials: false",yml)
        self.assertIn('group: golden-peanut-production-deploy',yml)
    def test_preview_uses_selected_branch_and_never_the_old_716_checkout(self):
        workflow=(WORKFLOWS/'pages-preview.yml').read_text(encoding='utf-8')
        self.assertIn('ref: ${{ github.ref_name }}',workflow)
        self.assertNotIn('ref: development/7.16-evidence-engine',workflow)
        self.assertIn('npm run test:browser',workflow)
        self.assertIn('golden-peanut-reviewed',workflow)
        self.assertIn("default: 'thegoldenpeanut'",workflow)

    def test_static_assets_support_conditional_revalidation_not_forced_unstored_download(self):
        headers=(ROOT/'app/_headers').read_text(encoding='utf-8')
        self.assertIn('Referrer-Policy: no-referrer',headers)
        self.assertIn('Cache-Control: no-cache, must-revalidate',headers)
        self.assertNotIn('no-store',headers)

if __name__=='__main__':unittest.main()
