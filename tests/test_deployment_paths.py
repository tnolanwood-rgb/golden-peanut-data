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
        self.assertIn(".github/production-release-request.txt",yml)
    def test_preview_uses_selected_branch_and_never_the_old_716_checkout(self):
        workflow=(WORKFLOWS/'pages-preview.yml').read_text(encoding='utf-8')
        self.assertIn('ref: ${{ github.ref_name }}',workflow)
        self.assertNotIn('ref: development/7.16-evidence-engine',workflow)
        self.assertIn('npm run test:browser',workflow)
        self.assertIn('GP_PREVIEW_BRANCH: golden-experience-staging',workflow)
        self.assertIn("default: 'golden-experience-staging'",workflow)
        self.assertIn("match.get('subdomain') != 'golden-experience-staging.pages.dev'",workflow)
        self.assertIn("project == 'thegoldenpeanut'",workflow)
        self.assertIn("Staging has an unknown configuration field",workflow)
        self.assertIn("Staging has a non-empty private binding",workflow)

    def test_static_assets_support_conditional_revalidation_not_forced_unstored_download(self):
        headers=(ROOT/'app/_headers').read_text(encoding='utf-8')
        self.assertIn('Referrer-Policy: no-referrer',headers)
        self.assertIn('Cache-Control: no-cache, must-revalidate',headers)
        self.assertNotIn('no-store',headers)


    def test_isolated_android_emulator_has_no_cloudflare_deploy_or_credentials(self):
        workflow=(WORKFLOWS/'golden-experience-emulator.yml').read_text()
        script=(ROOT/'scripts/verify_android_webview_emulator.cjs').read_text()
        self.assertIn('reactivecircus/android-emulator-runner@a421e43855164a8197daf9d8d40fe71c6996bb0d', workflow)
        self.assertIn('contents: read', workflow)
        self.assertNotIn('wrangler', workflow)
        self.assertNotIn('CLOUDFLARE_API_TOKEN', workflow)
        self.assertNotIn('CF_API_TOKEN', workflow)
        self.assertIn('com.goldenhub.dual.preview', script)
        self.assertNotIn('com.thegoldenpeanut.mobile', script)
        self.assertIn('native-android-swipe', script)
        self.assertIn('rotation-preserves-live-document', script)
        self.assertIn('background-resume-preserves-live-document', script)


class HubDeliveryGuards(unittest.TestCase):
    def test_manual_production_deploys_require_main(self):
        for filename, job in [('guided-ui-production.yml','validate-and-deploy'),('account-monitor-deploy.yml','deploy-monitor')]:
            doc=yaml.load((WORKFLOWS/filename).read_text(),Loader=yaml.BaseLoader)
            self.assertEqual(doc['jobs'][job]['if'], "github.ref == 'refs/heads/main'")
    def test_android_build_tests_and_delivers_the_reviewed_frontend_without_deployment(self):
        workflow=(WORKFLOWS/'private-hub-android.yml').read_text()
        self.assertIn('pull_request:',workflow)
        self.assertIn(':app:testDebugUnitTest :app:lintDebug',workflow)
        self.assertIn('bash ./gradlew',workflow)
        self.assertNotIn('wrangler',workflow)
        self.assertNotIn('adb install',workflow)
        self.assertIn('Prove APK embeds the exact reviewed frontend',workflow)
        self.assertIn('unzip -p "$APK" "assets/hub/$rel" | cmp - "$path"',workflow)
        self.assertIn('BUNDLED-ASSETS.txt',workflow)
        gradle=(ROOT/'android/app/build.gradle').read_text()
        self.assertIn("applicationId 'com.goldenhub.dual.preview'",gradle)
        self.assertIn("tasks.register('bundleHub', Sync)",gradle)
        self.assertIn("from rootProject.file('../app')",gradle)
        props=(ROOT/'android/gradle/wrapper/gradle-wrapper.properties').read_text()
        self.assertRegex(props,r'distributionSha256Sum=[0-9a-f]{64}')

if __name__=='__main__':unittest.main()
