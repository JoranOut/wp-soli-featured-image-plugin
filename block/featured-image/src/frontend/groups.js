import musicNotesSVG from "../../assets/img/music_notes.svg";

export default function Groups({groups}) {
    return (
        <div className="soli-groups">
            {
                groups && groups.map(group => {
                    return (
                        <div className="group">
                            <img src={musicNotesSVG}/>
                            <p>{group}</p>
                        </div>);
                })
            }
        </div>
    );
}
