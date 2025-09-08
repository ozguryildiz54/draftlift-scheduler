    -- -- -- -- -- -- -- -- JOINS -- -- -- -- -- -- -- -- -- -- -- -- -- -- --


-- * LEFT JOIN / Üst (FROM) tablodaki BÜTÜN kayıtlar ve JOIN tablodaki KESİŞEN kayıtları getir.
-- * INNER JOIN / Yalnızca kesişen kayıtları getirir. Default JOIN yöntemi INNER JOIN'dir. (Piyasa kullanımı: INNER JOIN)
-- * RIGHT JOIN / Üst (FROM) tablodaki KESİŞEN kayıtlar ve JOIN tablodaki BÜTÜN kayıtları getir.
-- * FULL OUTER JOIN -- Her iki tablonun BÜTÜN kayıtlarını göster, Eşleşenleri yanyana göster.

--? Her bir sanatçı ve ona ait albümleri listeleme (LEFT JOIN)

SELECT art.ArtistId, art.Name, alb.title, alb.AlbumId
FROM Artist art
LEFT JOIN Album alb ON art.ArtistId = alb.ArtistId;
ORDER BY ArtistId, AlbumId DESC;

--? Albüm bilgileri ile sanatçı bilgilerini birleştirme (RIGHT JOIN)

SELECT art.ArtistId, art.Name, alb.title, alb.AlbumId
FROM Artist art
RIGHT JOIN Album alb ON art.ArtistId = alb.ArtistId;
ORDER BY ArtistId, AlbumId DESC;

--? Müşteri bilgileri ile fatura bilgilerini birleştirme (INNER JOIN)


SELECT c.FirstName, c.LastName, c.Country, i.InvoiceId, i.InvoiceDate, i.Total InvoiceTotal
FROM Customer c
INNER JOIN Invoice i ON c.CustomerId = i.CustomerId
ORDER BY c.CustomerId;

--? Group by exmaple 
SELECT c.FirstName, c.LastName, c.Country, SUM(i.Total) InvoiceTotal
FROM Customer c
INNER JOIN Invoice i ON c.CustomerId = i.CustomerId
GROUP BY c.CustomerId
ORDER BY c.CustomerId;


--? Albüm ve sanatçı bilgilerini birleştirme (FULL OUTER JOIN)

SELECT *
FROM Customer c
FULL OUTER JOIN Invoice i ON c.CustomerId = i.CustomerId;


-- EXAMPLES


--? EXERCISE 1: Sanatçı adı ve albüm sayısını getirme (LEFT JOIN)
-- from raife hoca  👏🏻
SELECT b.Name, COUNT(a.AlbumId)
FROM Album AS a
LEFT JOIN Artist as b ON a.ArtistId=b.ArtistId
GROUP BY a.ArtistId;

-- from ali hoca  👏🏻
SELECT ar.ArtistId, COUNT(ar.Name)
FROM Artist  ar
LEFT JOIN Album al ON ar.ArtistId = al.ArtistId
GROUP BY ar.Name;


--? EXERCISE 2: En çok albümü olan ilk 5 sanatçıyı listeleyin 

-- from raife hoca 👏🏻
SELECT b.Name, COUNT(a.AlbumId) as AlbumSayisi
FROM Album AS a
LEFT JOIN Artist as b ON a.ArtistId=b.ArtistId
GROUP BY a.ArtistId
order by AlbumSayisi desc
limit 5

--? EXERCISE 3:Hiç albümü olmayan sanatçıları bulun


    /* INSERT & UPDATE & DELETE */

SELECT * 
FROM Genre;

-- **Yeni bir müzik türü (Genre) ekle**
INSERT INTO Genre (GenreId, Name) VALUES (26, 'Halk Müziği');

INSERT INTO Genre VALUES (27, 'Pop Müziği');
	
-- **Türk Pop Müziği olarak bir müzik türünün adını güncelle**
	
	
UPDATE Genre 
SET Name = 'Turk Pop Muzigi'
WHERE GenreId = 27;
	
-- **Genre tablosundan belirli bir kaydı sil**

DELETE FROM Genre
WHERE GenreId = 26;

-- Tablodaki tum datayi siler.
DELETE FROM Genre;



