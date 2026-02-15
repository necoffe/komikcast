const axios = require('axios');

const baseUrl = 'https://v1.komikcast.fit';
const allChunks = ["Db-XB06f.js", "E-RG9uDx.js", "Dn6704E1.js", "D6FrT2GR.js", "BNurJ4__.js", "DgSpbaFD.js", "DA-3nk_V.js", "nVvu6-VB.js", "B6-1PINz.js", "Dz26s58P.js", "DWFRAbx6.js", "E8k1JZxN.js", "_ah4W5VA.js", "fw29yAwx.js", "BELsqfvz.js", "B7TmkXQc.js", "D3BhElZi.js", "0tYUKmhY.js", "NjLIiuJC.js", "seLdQeOv.js", "JrQVZMk6.js", "CZnzvBoO.js", "Dc_FVRD7.js", "DQ7ZDt6K.js", "BSMzvj3P.js", "bEvrx1yk.js", "TAtlmiU4.js", "BUwGPmvI.js", "BdQq_4o_.js", "ovbjNhck.js", "DuL3i3-P.js", "BclS_AcH.js", "B6bOcFeu.js", "BxSJk-6x.js", "b7WXqkD7.js", "DC0wmZPS.js", "BILsV1aC.js", "bgiuSVpJ.js", "Id2f18On.js", "ZjDwoS5v.js", "B0h3kpKc.js", "Bzvl-SxO.js", "CVM18uUr.js", "Qbxva-Q8.js", "CVWGqXyx.js", "C8DGCxIW.js", "DvV37sWr.js", "C2y3ljBD.js", "CBPboczI.js", "CVya6wtP.js", "qu6M9xeq.js", "Ds965Ym3.js", "D-_yL9eF.js", "D4Wn96V0.js", "DYK_ZPo_.js", "nu0AOL1f.js", "BDl6sMAR.js", "w5LyBI1l.js", "DGWuDLDJ.js", "D2izqw-0.js", "DrB9SjKB.js", "2x4NKccE.js", "J3elfZx6.js", "DeJUXsgn.js", "CTc0V20g.js", "Ck5i1c2n.js", "BX-7Fn4p.js", "8SnJZPHF.js", "CulrExcg.js", "Ccv66CU5.js", "8Vc9GzNi.js", "FPzRt-D0.js", "Bhc4CY1z.js", "CN4THD3Z.js", "BPk9Skf2.js", "Cr4Gtb_u.js", "BbdFEkeC.js", "DaOhlrFE.js", "U0DqEZ6y.js", "i9eirKl7.js", "DWLadPI2.js", "M6Hdtw8m.js", "Cju4HD_Z.js", "pnHUVob1.js", "BePb3yxf.js", "BNyTB5Dj.js", "CsOv64gU.js", "D2NTLjKV.js", "DwVRKE7Z.js", "BL2cBcoo.js", "DPb3jJRL.js", "DEiDqZIS.js", "1UEpWwj-.js", "Bq0zPq7R.js", "DbMN4vlX.js", "DRsRUMHz.js", "B7A9qciq.js", "BUl3nDwu.js", "DB6DXgAn.js", "MR3PD5Q7.js", "D4PeJJ54.js", "C-xZaQkG.js", "CP90_bKj.js", "CuOUDRUX.js", "D9XYKiLi.js", "CxlRfSIS.js", "Du41sYj3.js", "BgD3d-zA.js", "B1XMCF0n.js", "Cf7CWc79.js", "BR5nQ0RA.js", "CALCPokF.js", "C3-2Ygff.js", "Cv7xlrYY.js", "Gm9P3jKR.js", "CuO4yjoe.js", "RiCBD3rl.js", "DBGjn9ZM.js", "57tUpdA3.js", "BOPCdH8z.js", "JtGcKvRf.js", "BvxF-InC.js", "BY1FQl2J.js", "Bdf8ocQr.js", "DKsskBDF.js", "TlkHAB2E.js"];

async function searchImages() {
    for (const chunk of allChunks) {
        try {
            const url = `${baseUrl}/assets/${chunk}`;
            const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const text = res.data;

            // Look for data patterns
            if (text.includes('chapter') && (text.includes('images') || text.includes('pages'))) {
                console.log(`\n=== MATCH in ${chunk} ===`);
                // Find context
                const imgContext = text.match(/.{0,50}(images|pages).{0,50}/g);
                if (imgContext) imgContext.slice(0, 5).forEach(m => console.log(m));

                // Look for API calls
                if (text.includes('chapter/')) {
                    const apiCalls = text.match(/.{0,30}chapter\/.{0,30}/g);
                    if (apiCalls) apiCalls.slice(0, 5).forEach(m => console.log(m));
                }
            }
        } catch (e) { }
    }
}

searchImages();
