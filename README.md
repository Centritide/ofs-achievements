# OFS Achievements

[Based on cloudflare workers slash command bot tutorial](https://discord.com/developers/docs/tutorials/hosting-on-cloudflare-workers)
database hosted on planetscale

Bot for recording and displaying achievements in the salmon run overfishing server

## features
- record scores for user (s3, event, and s2 scores) in a database
- display scores for a user
- it works
- at any time i can say i have 300 eggs day only and no one can dispute it
- permission locking commands to certain roles (eg only staff can update scores)

## future features (?)
- added to OFS
- allow user to delete some/all of their scores

- add badges (emoji) to the profile
- command to automatically record scores for a user into the database based on OFS roles
- allow user to automatically choose their discord role badge based on scores in their profile, and add ofs roles based on profile
- profile command options with different layouts

- feature suggestions?

## anything further down probably will not happen

- additional achievements like average or challenge categories, or single waves, etc
- other fun badges like tournaments. i am become sendou.ink
- clean up spaghetti code
- i actually understand the code

## database schema
CREATE TABLE `users_prod` (
	`id` decimal(19,0) NOT NULL,
	`sgnormal` int DEFAULT 0,`mbnormal` int DEFAULT 0,`ssynormal` int DEFAULT 0,`sstnormal` int DEFAULT 0,`gfhnormal` int DEFAULT 0,`jsjnormal` int DEFAULT 0,
`sggreen_random` int DEFAULT 0,`mbgreen_random` int DEFAULT 0,`ssygreen_random` int DEFAULT 0,`sstgreen_random` int DEFAULT 0,`gfhgreen_random` int DEFAULT 0,`jsjgreen_random` int DEFAULT 0,
`sgsingle_random` int DEFAULT 0,`mbsingle_random` int DEFAULT 0,`ssysingle_random` int DEFAULT 0,`sstsingle_random` int DEFAULT 0,`gfhsingle_random` int DEFAULT 0,`jsjsingle_random` int DEFAULT 0,
`sggolden_random` int DEFAULT 0,`mbgolden_random` int DEFAULT 0,`ssygolden_random` int DEFAULT 0,`sstgolden_random` int DEFAULT 0,`gfhgolden_random` int DEFAULT 0,`jsjgolden_random` int DEFAULT 0,
`sgnormalday` int DEFAULT 0,`mbnormalday` int DEFAULT 0,`ssynormalday` int DEFAULT 0,`sstnormalday` int DEFAULT 0,`gfhnormalday` int DEFAULT 0,`jsjnormalday` int DEFAULT 0,
`sggreen_randomday` int DEFAULT 0,`mbgreen_randomday` int DEFAULT 0,`ssygreen_randomday` int DEFAULT 0,`sstgreen_randomday` int DEFAULT 0,`gfhgreen_randomday` int DEFAULT 0,`jsjgreen_randomday` int DEFAULT 0,
`sgsingle_randomday` int DEFAULT 0,`mbsingle_randomday` int DEFAULT 0,`ssysingle_randomday` int DEFAULT 0,`sstsingle_randomday` int DEFAULT 0,`gfhsingle_randomday` int DEFAULT 0,`jsjsingle_randomday` int DEFAULT 0,
`sggolden_randomday` int DEFAULT 0,`mbgolden_randomday` int DEFAULT 0,`ssygolden_randomday` int DEFAULT 0,`sstgolden_randomday` int DEFAULT 0,`gfhgolden_randomday` int DEFAULT 0,`jsjgolden_randomday` int DEFAULT 0,
`sgprincess` int DEFAULT 0,`mbprincess` int DEFAULT 0,`ssyprincess` int DEFAULT 0,`sstprincess` int DEFAULT 0,`gfhprincess` int DEFAULT 0,`jsjprincess` int DEFAULT 0,
`sg` int DEFAULT 0,`mb` int DEFAULT 0,`ssy` int DEFAULT 0,`sst` int DEFAULT 0,`gfh` int DEFAULT 0,`jsj` int DEFAULT 0,
`sgday` int DEFAULT 0,`mbday` int DEFAULT 0,`ssyday` int DEFAULT 0,`sstday` int DEFAULT 0,`gfhday` int DEFAULT 0,`jsjday` int DEFAULT 0,
`s2sg` int DEFAULT 0,`s2mb` int DEFAULT 0,`s2lo` int DEFAULT 0,`s2ss` int DEFAULT 0,`s2ap` int DEFAULT 0,
`s2sgday` int DEFAULT 0,`s2mbday` int DEFAULT 0,`s2loday` int DEFAULT 0,`s2ssday` int DEFAULT 0,`s2apday` int DEFAULT 0,
`s2sgnormal` int DEFAULT 0,`s2mbnormal` int DEFAULT 0,`s2lonormal` int DEFAULT 0,`s2ssnormal` int DEFAULT 0,`s2apnormal` int DEFAULT 0,
`s2sggreen_random` int DEFAULT 0,`s2mbgreen_random` int DEFAULT 0,`s2logreen_random` int DEFAULT 0,`s2ssgreen_random` int DEFAULT 0,`s2apgreen_random` int DEFAULT 0,
`s2sgsingle_random` int DEFAULT 0,`s2mbsingle_random` int DEFAULT 0,`s2losingle_random` int DEFAULT 0,`s2sssingle_random` int DEFAULT 0,`s2apsingle_random` int DEFAULT 0,
`s2sggolden_random` int DEFAULT 0,`s2mbgolden_random` int DEFAULT 0,`s2logolden_random` int DEFAULT 0,`s2ssgolden_random` int DEFAULT 0,`s2apgolden_random` int DEFAULT 0,
`s2sgnormalday` int DEFAULT 0,`s2mbnormalday` int DEFAULT 0,`s2lonormalday` int DEFAULT 0,`s2ssnormalday` int DEFAULT 0,`s2apnormalday` int DEFAULT 0,
`s2sggreen_randomday` int DEFAULT 0,`s2mbgreen_randomday` int DEFAULT 0,`s2logreen_randomday` int DEFAULT 0,`s2ssgreen_randomday` int DEFAULT 0,`s2apgreen_randomday` int DEFAULT 0,
`s2sgsingle_randomday` int DEFAULT 0,`s2mbsingle_randomday` int DEFAULT 0,`s2losingle_randomday` int DEFAULT 0,`s2sssingle_randomday` int DEFAULT 0,`s2apsingle_randomday` int DEFAULT 0,
`s2sggolden_randomday` int DEFAULT 0,`s2mbgolden_randomday` int DEFAULT 0,`s2logolden_randomday` int DEFAULT 0,`s2ssgolden_randomday` int DEFAULT 0,`s2apgolden_randomday` int DEFAULT 0,
`s2sgprincess` int DEFAULT 0,`s2mbprincess` int DEFAULT 0,`s2loprincess` int DEFAULT 0,`s2ssprincess` int DEFAULT 0,`s2apprincess` int DEFAULT 0,
`br1` int DEFAULT 0,`br2` int DEFAULT 0,`br3` int DEFAULT 0,`br4` int DEFAULT 0,
`ew1` int DEFAULT 0,`ew2` int DEFAULT 0,`ew3` int DEFAULT 0,`ew4` int DEFAULT 0,
`princess` int DEFAULT 0,`s2princess` int DEFAULT 0,
	PRIMARY KEY (`id`)
) 
