var express = require('express');
var router = express.Router();
const request = require('request');
var mysql = require('mysql');
var animeObj = require(`../objects/animesObj`)
var animeSend = require(`../objects/animeSend`)
var epObj = require(`../objects/animeEpDownload`)
Number.prototype.pad = function (size) {
    var s = String(this);
    while (s.length < (size || 2)) { s = "0" + s; }
    return s;
}
const si = require('nyaapi')


var con = mysql.createConnection({
    host: "192.168.0.33",
    user: "roger",
    password: "1234",
    database: "DBHOUSE"
});

/* GET all animes listing. */
router.get('/allAnimes', async function (req, res, next) {
    try{
    con.query("SELECT * FROM DBHOUSE.TB_ANIMES", async function (err, result, fields) {
        if (err) throw err;
        //console.log(converteQueryObjeto(result));
        res.status(200).send(converteQueryObjeto(result));

    });
} catch (err) {
    throw err;
}
});

/* GET animes not completed listing. */
router.get('/', async function (req, res, next) {
    try {
        con.query("SELECT * FROM DBHOUSE.TB_ANIMES  where COMPLETO=0", async function (err, result, fields) {
            if (err) throw err;
            //console.log(converteQueryObjeto(result));
            res.status(200).send(converteQueryObjeto(result));

        });
    } catch (err) {
        throw err;
    }
});

router.get('/epsToDownload', async function (req, res, next) {
    try {

        con.query("SELECT * FROM DBHOUSE.TBL_DOWNLOAD_EP  where DOWNLOADED=0", async function (err, result, fields) {
            if (err) throw err;
            //console.log(result);

            var animes = retornaObjDownload(result);
            res.status(200).send(animes);

        });
    } catch (err) {
        throw err;
    }
});





/* POST anime to listing. */
router.post('/', async function (req, res, next) {
    //res.send(req.body);
    try {

        var anime = new animeSend(req.body.name, req.body.season, req.body.diaDownload, req.body.userNyaasi)
        //console.log(`SELECT * FROM DBHOUSE.TB_ANIMES  where NAME_ANIME='${anime.name}'`);
        var precisaSeason = anime.season === 1 ? 0 : 1;
        con.query(`SELECT * FROM DBHOUSE.TB_ANIMES  where NAME_ANIME='${anime.name}'`, async function (err, resultAnime, fields) {
            if (err) throw err;
            if (resultAnime.length > 0) {
                res.status(400).send('anime ja existe na base')
            } else {
                con.query(`INSERT INTO \`DBHOUSE\`.\`TB_ANIMES\` 
                        (\`NAME_ANIME\`, 
                         \`SEASON\`, 
                         \`DIA_DOWNLOAD\`, 
                         \`CATEGORIA\`,
                         \`PRECISA_SEASON\`,
                         \`NAME_AMIGAVEL\`,
                         \`USER_NYAASI\`) 
                    VALUES 
                        ('${anime.name}', 
                         '${anime.season}', 
                         '${anime.diaDownload}',
                         '${anime.name.replace(/\s/g, '')}S${(anime.season).pad()}',
                          ${precisaSeason},
                         '${retornaNomeDecente(anime)}',
                         '${anime.userNyaasi}');`,
                    async function (err, result, fields) {
                        if (err) res.status(500).send(err);
                        ////console.log(result.insertId)
                        con.query(`SELECT * FROM DBHOUSE.TB_ANIMES  where COMPLETO=0 and ID_ANIMES=${result.insertId}`, async function (err, result, fields) {
                            if (err) throw err;
                            //console.log(converteQueryObjeto(result));
                            res.status(201).send(converteQueryObjeto(result));

                        });

                    });
            }
        });

    } catch (err) {
        throw err;
    }
});








router.put('/buscaAnimeDownload/:idAnime', async function (req, res, next) {
    try {

        //console.log(req.params);
        con.query(`SELECT * FROM DBHOUSE.TB_ANIMES  where ID_ANIMES='${req.params.idAnime}'`, async function (err, resultAnime, fields) {
            if (err) throw err;
            var animes = converteQueryObjeto(resultAnime);
            var anime = animes[0];
            if (anime.userNyaasi.toLowerCase() == 'subsplease') {
                await procuraAnimeSubsPlease(anime, anime.episodes + 1, function (resultado) {
                    if (resultado.length === 1) {
                        ////console.log(`SELECT * FROM DBHOUSE.TBL_DOWNLOAD_EP  where NOME_EP='${anime.nomeAmigavel}${(anime.episodes+1).pad()}'`)
                        con.query(`SELECT * FROM DBHOUSE.TBL_DOWNLOAD_EP  where NOME_EP='${anime.nomeAmigavel}${(anime.episodes + 1).pad()}'`, async function (err, resultEp, fields) {
                            if (err) throw err;
                            if (resultEp.length > 0) {
                                res.status(409).send('ep ja existe na base, ta liberado duplicata não porra')
                            } else {
                                //console.log((anime.episodes + 1).pad())
                                //console.log((2).pad())
                                //console.log(`'${anime.categoria}', '${anime.nomeAmigavel}${(anime.episodes + 1).pad()}'`);
                                con.query(`INSERT INTO \`DBHOUSE\`.\`TBL_DOWNLOAD_EP\` (\`CATEGORIA\`, \`NOME_EP\`, \`MAGNET_LINK\`) VALUES ('${anime.categoria}', '${anime.nomeAmigavel}${(anime.episodes + 1).pad()}', '${resultado[0].magnet}');`, async function (err, resultEp, fields) {
                                    if (err) throw err;
                                    con.query(`UPDATE \`DBHOUSE\`.\`TB_ANIMES\` SET \`EPISODES\` = '${anime.episodes + 1}' WHERE (\`ID_ANIMES\` = '${req.params.idAnime}');`, async function (err, resultEp, fields) {
                                        res.status(201).send('ep inserido na base')
                                    });
                                });
                            }
                        });
                    } else {
                        res.status(404).send('Episódio ainda não saiu');
                    }
                })
            } else if (anime.userNyaasi.toLowerCase() == 'erai-raws') {
                await procuraAnimeEraiRaws(anime, anime.episodes + 1, function (resultado) {
                    //console.log(resultado.length)

                    resultado.forEach(function (data) {
                        console.log(data.name)
                    })

                    if (resultado.length === 1) {
                        ////console.log(`SELECT * FROM DBHOUSE.TBL_DOWNLOAD_EP  where NOME_EP='${anime.nomeAmigavel}${(anime.episodes+1).pad()}'`)
                        con.query(`SELECT * FROM DBHOUSE.TBL_DOWNLOAD_EP  where NOME_EP='${anime.nomeAmigavel}${(anime.episodes + 1).pad()}'`, async function (err, resultEp, fields) {
                            if (err) throw err;
                            if (resultEp.length > 0) {
                                res.status(409).send('ep ja existe na base, ta liberado duplicata não porra')
                            } else {
                                //console.log((anime.episodes + 1).pad())
                                //console.log((2).pad())
                                //console.log(`'${anime.categoria}', '${anime.nomeAmigavel}${(anime.episodes + 1).pad()}'`);
                                con.query(`INSERT INTO \`DBHOUSE\`.\`TBL_DOWNLOAD_EP\` (\`CATEGORIA\`, \`NOME_EP\`, \`MAGNET_LINK\`) VALUES ('${anime.categoria}', '${anime.nomeAmigavel}${(anime.episodes + 1).pad()}', '${resultado[0].magnet}');`, async function (err, resultEp, fields) {
                                    if (err) throw err;
                                    con.query(`UPDATE \`DBHOUSE\`.\`TB_ANIMES\` SET \`EPISODES\` = '${anime.episodes + 1}' WHERE (\`ID_ANIMES\` = '${req.params.idAnime}');`, async function (err, resultEp, fields) {
                                        res.status(201).send('ep inserido na base')
                                    });
                                });
                            }
                        });
                    } else {
                        res.status(404).send('Episódio ainda não saiu');
                    }
                })
            }
            else {
                res.status(400).send('nome do usuario n faz sentido meu')
            }
        });
    } catch (err) {
        throw err;
    }
});

router.put('/addSeasonAnime/:idAnime', async function (req, res, next) {
    try {

        con.query(`SELECT * FROM DBHOUSE.TB_ANIMES  where ID_ANIMES='${req.params.idAnime}'`, async function (err, resultAnime, fields) {
            if (err) res.status(500).send(err);

            var anime = converteQueryObjeto(resultAnime)[0];
            //console.log(anime)
            anime.season++;
            if (anime.season > 1)
                anime.precisaSeason = true;
            anime.nomeAmigavel = retornaNomeDecente(anime);
            //console.log(anime.name)
            anime.categoria = `${anime.name.replace(/\s/g, '')}S${(anime.season).pad()}`;
            if (anime.completo)
                anime.completo = false;


            con.query(`UPDATE \`DBHOUSE\`.\`TB_ANIMES\` SET 
                            \`NAME_AMIGAVEL\` = '${anime.nomeAmigavel}', 
                            \`PRECISA_SEASON\` = 1, 
                            \`CATEGORIA\` = '${anime.categoria}', 
                            \`COMPLETO\` = 0, 
                            \`SEASON\` = ${anime.season}, 
                            \`EPISODES\` = 0 
                            WHERE (\`ID_ANIMES\` = ${req.params.idAnime});`, async function (err, resultUpdate, fields) {
                if (err) res.status(500).send(err);

                res.status(201).send(anime);
            });
        });
    } catch (err) {
        throw err;
    }
});

router.put('/completaAnime/:idAnime', async function (req, res, next) {
    try {
        con.query(`UPDATE \`DBHOUSE\`.\`TB_ANIMES\` SET \`COMPLETO\` = 1 WHERE (\`ID_ANIMES\` = '${req.params.idAnime}')`, async function (err, resultAnime, fields) {
            if (err) res.status(500).send(err);

            res.status(200).send('Finalizado o Anime')


        });
    } catch (err) {
        throw err;
    }
});

router.put('/completaDownload/:idEpisode', async function (req, res, next) {
    try {
        con.query(`UPDATE \`DBHOUSE\`.\`TBL_DOWNLOAD_EP\` SET \`DOWNLOADED\` = '1' WHERE (\`ID_EP\` = '${req.params.idEpisode}');`, async function (err, resultAnime, fields) {
            if (err) res.status(500).send(err);

            res.status(200).send('Finalizado o Download')


        });
    } catch (err) {
        throw err;
    }
});







const diaSemana = {
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
    domingo: 7
}

function converteQueryObjeto(data) {
    var animes = []
    data.forEach(function (anime) {
        animes.push(new animeObj(
            idAnime = anime.ID_ANIMES,
            name = anime.NAME_ANIME,
            nomeAmigavel = anime.NAME_AMIGAVEL,
            precisaSeason = anime.PRECISA_SEASON === 1,
            magnet = anime.MAGNET_LINK,
            categoria = anime.CATEGORIA,
            completo = anime.COMPLETO === 1,
            season = anime.SEASON,
            episodes = anime.EPISODES,
            diaDownload = anime.DIA_DOWNLOAD,
            userNyaasi = anime.USER_NYAASI,
        ));
    })
    return animes;
}

var options = {
    url: 'https://api.github.com/repos/rogersalvadeo256/AnimesJson/contents/animes.json',
    method: 'GET',
    //json: requestBody,
    headers: {
        'User-Agent': 'my request',
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

function retornaNomeDecente(anime) {
    var nomeDecente = anime.name + " -";
    nomeDecente += ` S${anime.season}`
    nomeDecente += `E`
    return nomeDecente
}

async function procuraAnimeSubsPlease(anime, ep, _callback) {
    var stringSearch = "[SubsPlease] "
    stringSearch += anime.name;
    if (anime.precisaSeason)
        stringSearch += ` S${anime.season}`
    stringSearch += ` - ${(ep).pad()}`
    stringSearch += " (1080p)"
    //console.log(stringSearch)
    var testge = await si.si.searchByUser('SubsPlease', stringSearch)
    var animesFim = [];
    ////console.log(testge)
    testge.forEach(function (animet) {
        //    //console.log(animet.name.replace(/\[[\s\S]*?\]/g, '').replace(/ \([\s\S]*?\)/g, '').replace(/.mkv/g, '').trim())
        var nome = "";
        if (anime.precisaSeason) {
            nome = `${anime.name} S${anime.season} - ${(ep).pad()}`
        } else {
            nome = `${anime.name} - ${(ep).pad()}`
        }
        //    //console.log(animet.name.replace(/\[[\s\S]*?\]/g, '').replace(/ \([\s\S]*?\)/g, '').replace(/.mkv/g, '').trim()==nome)
        //    //console.log(animet.name.replace(/\[[\s\S]*?\]/g, '').replace(/ \([\s\S]*?\)/g, '').replace(/.mkv/g, '').trim())
        //    //console.log(nome);
        if (animet.name.replace(/\[[\s\S]*?\]/g, '').replace(/ \([\s\S]*?\)/g, '').replace(/.mkv/g, '').trim() == nome)
            animesFim.push(animet);
    })
    ////console.log(animesFim);
    ////console.log(animesFim)
    _callback(animesFim);
}

async function procuraAnimeEraiRaws(anime, ep, _callback) {

    ////console.log(anime)

    var searchstrings = "";

    if (anime.precisaSeason) {
        searchstrings += `${anime.name} Season ${anime.season} - ${(ep).pad()} [1080p]`;
    } else {
        searchstrings += `${anime.name} - ${(ep).pad()} [1080p]`
    }

    var nomeSeason = "";
    if (anime.precisaSeason) {
        nomeSeason = `${anime.name} Season ${anime.season} - ${(ep).pad()}`
    } else {
        nomeSeason = `${anime.name} - ${(ep).pad()}`
    }

    var nomeTh = "";
    if (anime.precisaSeason) {
        nomeTh = `${anime.name} ${anime.season}${nth(anime.season)} Season - ${(ep).pad()}`
    } else {
        nomeTh = `${anime.name} - ${(ep).pad()}`
    }
    var animes = []


    //console.log(searchstrings)
    var testge = await si.si.searchByUser('Erai-raws', searchstrings)
    testge.forEach(function (anime) {

        if (!anime.name.includes('[HEVC]') && animes.length!=1) {
            var nomeTorrent = anime.name.replace(/\[[\s\S]*?\]/g, '').replace(/ \([\s\S]*?\)/g, '').replace('v2', '').replace('V2', '').replace('END', '').replace(/.mkv/g, '').trim();

            

            //console.log(nomeTorrent);
            //console.log(nomeTh)
            //console.log(nomeSeason)
            if (nomeTorrent == nomeSeason || nomeTorrent == nomeTh)
                animes.push(anime)
            

        }
    })

    //
    _callback(animes);
}





function retornaObjDownload(downloads) {
    var normal = []
    downloads.forEach(function (data) {
        normal.push(new epObj(data.ID_EP, data.CATEGORIA, data.NOME_EP, data.MAGNET_LINK, data.DOWNLOADED))
    })
    return normal;
}

const nth = function (d) {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

module.exports = router;
