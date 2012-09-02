require 'open-uri'

class GroupController < ApplicationController
  def show
    respond_to do |format|
      format.json {
        doc = Nokogiri::XML(open("http://steamcommunity.com/groups/#{params[:id]}/memberslistxml/?xml=1").read)
        
        @members = []
        doc.search('members/steamID64').each do |id|
          @members << id.content
        end
        
        render :json => @members
      }
      format.html
    end
  end
end
